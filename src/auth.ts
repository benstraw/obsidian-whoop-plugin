import { App, Modal, Notice, Setting, requestUrl } from "obsidian";

const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const SCOPES =
  "offline read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout";

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at: number; // Unix timestamp ms
}

export interface AuthSettings {
  clientId: string;
  clientSecret: string;
  tokens: TokenData | null;
}

function randomState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildAuthUrl(clientId: string): { url: string; state: string } {
  const state = randomState();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: "obsidian://whoop-callback",
    scope: SCOPES,
    state,
  });
  return { url: `${AUTH_URL}?${params.toString()}`, state };
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await requestUrl({
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (resp.status !== 200) {
    throw new Error(
      `Token exchange failed: ${resp.status} ${JSON.stringify(resp.json)}`
    );
  }

  const data = resp.json as Omit<TokenData, "expires_at">;
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshTokens(
  tokens: TokenData,
  clientId: string,
  clientSecret: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await requestUrl({
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (resp.status !== 200) {
    throw new Error(
      `Token refresh failed: ${resp.status} ${JSON.stringify(resp.json)}`
    );
  }

  const data = resp.json as Omit<TokenData, "expires_at">;
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/** Returns a valid access token, refreshing if needed. Throws if not authed. */
export async function getValidToken(
  auth: AuthSettings,
  saveTokens: (t: TokenData) => Promise<void>
): Promise<string> {
  if (!auth.tokens) {
    throw new Error("Not authenticated. Please authorize with WHOOP first.");
  }

  // Refresh if expiring within 5 minutes
  if (Date.now() + 5 * 60 * 1000 >= auth.tokens.expires_at) {
    const refreshed = await refreshTokens(
      auth.tokens,
      auth.clientId,
      auth.clientSecret
    );
    await saveTokens(refreshed);
    return refreshed.access_token;
  }

  return auth.tokens.access_token;
}

/** Modal: shows the auth URL and a text field to paste the callback URL or code. */
export class AuthModal extends Modal {
  private authUrl: string;
  private state: string;
  private clientId: string;
  private clientSecret: string;
  private onTokens: (tokens: TokenData) => Promise<void>;

  constructor(
    app: App,
    clientId: string,
    clientSecret: string,
    onTokens: (tokens: TokenData) => Promise<void>
  ) {
    super(app);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.onTokens = onTokens;

    const { url, state } = buildAuthUrl(clientId);
    this.authUrl = url;
    this.state = state;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("whoop-modal");
    contentEl.createEl("h2", { text: "Authorize with WHOOP" });

    const instructions = contentEl.createDiv("whoop-auth-instructions");
    instructions.createEl("p", {
      text: "Complete these steps to connect your WHOOP account:",
    });
    const ol = instructions.createEl("ol");
    ol.createEl("li", {
      text: "Click the button below to open the WHOOP authorization page in your browser.",
    });
    ol.createEl("li", {
      text: 'Authorize the app. You will be redirected to an "obsidian://" URL.',
    });
    ol.createEl("li", {
      text: 'If Obsidian opens automatically, authorization completes. Otherwise, copy the "code" parameter from the URL bar and paste it below.',
    });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Open WHOOP Authorization Page")
        .setCta()
        .onClick(() => {
          window.open(this.authUrl, "_blank");
        });
    });

    let codeInput = "";
    new Setting(contentEl)
      .setName("Authorization code")
      .setDesc(
        'Paste the full callback URL or just the "code" value from the URL here.'
      )
      .addText((text) => {
        text
          .setPlaceholder("Paste code or full callback URL…")
          .onChange((v) => {
            codeInput = v.trim();
          });
      });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Complete Authorization")
        .setCta()
        .onClick(async () => {
          if (!codeInput) {
            new Notice("Please paste the authorization code first.");
            return;
          }

          // Accept either full URL or bare code
          let code = codeInput;
          try {
            const u = new URL(codeInput);
            const extracted = u.searchParams.get("code");
            if (extracted) code = extracted;
          } catch {
            // not a URL — use as-is
          }

          try {
            const tokens = await exchangeCode(
              code,
              this.clientId,
              this.clientSecret,
              "obsidian://whoop-callback"
            );
            await this.onTokens(tokens);
            new Notice("WHOOP authorization successful!");
            this.close();
          } catch (e) {
            new Notice(`Authorization failed: ${(e as Error).message}`);
          }
        });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
