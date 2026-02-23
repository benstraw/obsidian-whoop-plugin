import {
  App,
  Modal,
  Notice,
  Plugin,
  Setting,
  TFile,
  normalizePath,
} from "obsidian";
import { DEFAULT_SETTINGS, WhoopSettingTab, WhoopSettings } from "./settings.ts";
import { getValidToken, TokenData } from "./auth.ts";
import { WhoopClient } from "./client.ts";
import {
  addDays,
  formatDateUTC,
  getDayData,
  isoWeekStart,
  startOfDayUTC,
} from "./fetch.ts";
import {
  buildWeekStats,
  buildPersonaData,
  dailyNotePath,
  weeklyNotePath,
  personaNotePath,
} from "./render.ts";
import { renderDaily } from "./templates/daily.ts";
import { renderWeekly } from "./templates/weekly.ts";
import { renderPersona } from "./templates/persona.ts";

export default class WhoopPlugin extends Plugin {
  settings!: WhoopSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new WhoopSettingTab(this.app, this));

    // Ribbon icon — one-click daily note generation
    this.addRibbonIcon("activity", "Generate today's WHOOP note", async () => {
      await this.generateDailyNote(new Date());
    });

    // Commands
    this.addCommand({
      id: "generate-daily-today",
      name: "Generate today's daily note",
      callback: async () => {
        await this.generateDailyNote(new Date());
      },
    });

    this.addCommand({
      id: "generate-daily-date",
      name: "Generate daily note for a specific date…",
      callback: () => {
        new DatePickerModal(this.app, "Generate Daily Note", async (dateStr) => {
          const date = parseLocalDate(dateStr);
          if (!date) {
            new Notice("Invalid date. Use YYYY-MM-DD format.");
            return;
          }
          await this.generateDailyNote(date);
        }).open();
      },
    });

    this.addCommand({
      id: "generate-weekly-current",
      name: "Generate current week's weekly note",
      callback: async () => {
        await this.generateWeeklyNote(new Date());
      },
    });

    this.addCommand({
      id: "generate-weekly-date",
      name: "Generate weekly note for a specific week…",
      callback: () => {
        new DatePickerModal(
          this.app,
          "Generate Weekly Note (enter any date in that week)",
          async (dateStr) => {
            const date = parseLocalDate(dateStr);
            if (!date) {
              new Notice("Invalid date. Use YYYY-MM-DD format.");
              return;
            }
            await this.generateWeeklyNote(date);
          }
        ).open();
      },
    });

    this.addCommand({
      id: "backfill-days",
      name: "Backfill last N days…",
      callback: () => {
        new BackfillModal(this.app, async (n) => {
          await this.backfillDays(n);
        }).open();
      },
    });

    this.addCommand({
      id: "generate-persona",
      name: "Generate 30-day health persona",
      callback: async () => {
        await this.generatePersona();
      },
    });

    // Register obsidian://whoop-callback handler for OAuth option A
    this.registerObsidianProtocolHandler("whoop-callback", async (params) => {
      const code = params["code"];
      if (!code) {
        new Notice("WHOOP callback received but no code found.");
        return;
      }
      try {
        const { exchangeCode } = await import("./auth.ts");
        const tokens = await exchangeCode(
          code,
          this.settings.clientId,
          this.settings.clientSecret,
          "obsidian://whoop-callback"
        );
        this.settings.tokens = tokens;
        await this.saveSettings();
        new Notice("WHOOP authorization successful!");
      } catch (e) {
        new Notice(`WHOOP authorization failed: ${(e as Error).message}`);
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async getClient(): Promise<WhoopClient> {
    if (!this.settings.clientId || !this.settings.clientSecret) {
      throw new Error(
        "WHOOP credentials not configured. Please open Settings → WHOOP."
      );
    }
    const token = await getValidToken(
      {
        clientId: this.settings.clientId,
        clientSecret: this.settings.clientSecret,
        tokens: this.settings.tokens,
      },
      async (t: TokenData) => {
        this.settings.tokens = t;
        await this.saveSettings();
      }
    );
    return new WhoopClient(token);
  }

  async generateDailyNote(date: Date) {
    const notice = new Notice("Fetching WHOOP data…", 0);
    try {
      const client = await this.getClient();
      const day = startOfDayUTC(date);
      const data = await getDayData(client, day);
      const content = renderDaily(data);
      const path = dailyNotePath(day, this.settings.outputFolder);
      await this.writeNote(path, content);
      notice.hide();
      new Notice(`Daily note written: ${path}`);
    } catch (e) {
      notice.hide();
      new Notice(`Error: ${(e as Error).message}`);
      console.error("[WHOOP]", e);
    }
  }

  async generateWeeklyNote(date: Date) {
    const notice = new Notice("Fetching WHOOP data for the week…", 0);
    try {
      const client = await this.getClient();
      const monday = isoWeekStart(startOfDayUTC(date));
      const days = await Promise.all(
        Array.from({ length: 7 }, (_, i) =>
          getDayData(client, addDays(monday, i))
        )
      );
      const stats = buildWeekStats(days);
      const content = renderWeekly(stats);
      const path = weeklyNotePath(monday, this.settings.outputFolder);
      await this.writeNote(path, content);
      notice.hide();
      new Notice(`Weekly note written: ${path}`);
    } catch (e) {
      notice.hide();
      new Notice(`Error: ${(e as Error).message}`);
      console.error("[WHOOP]", e);
    }
  }

  async generatePersona() {
    const notice = new Notice("Fetching 30 days of WHOOP data…", 0);
    try {
      const client = await this.getClient();
      const today = startOfDayUTC(new Date());
      const days = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          getDayData(client, addDays(today, -(29 - i)))
        )
      );
      const persona = buildPersonaData(days);
      const content = renderPersona(persona);
      const path = personaNotePath(this.settings.outputFolder);
      await this.writeNote(path, content);
      notice.hide();
      new Notice(`Health persona written: ${path}`);
    } catch (e) {
      notice.hide();
      new Notice(`Error: ${(e as Error).message}`);
      console.error("[WHOOP]", e);
    }
  }

  async backfillDays(n: number) {
    const notice = new Notice(`Backfilling ${n} days…`, 0);
    try {
      const client = await this.getClient();
      const today = startOfDayUTC(new Date());
      let written = 0;
      let skipped = 0;

      for (let i = n - 1; i >= 0; i--) {
        const day = addDays(today, -i);
        const path = dailyNotePath(day, this.settings.outputFolder);
        const existing = this.app.vault.getAbstractFileByPath(normalizePath(path));
        if (existing) {
          skipped++;
          continue;
        }
        const data = await getDayData(client, day);
        const content = renderDaily(data);
        await this.writeNote(path, content);
        written++;
      }

      notice.hide();
      new Notice(`Backfill complete: ${written} written, ${skipped} skipped (already existed).`);
    } catch (e) {
      notice.hide();
      new Notice(`Error: ${(e as Error).message}`);
      console.error("[WHOOP]", e);
    }
  }

  private async writeNote(path: string, content: string) {
    const normalPath = normalizePath(path);
    // Ensure parent folder exists
    const parts = normalPath.split("/");
    parts.pop(); // remove filename
    if (parts.length > 0) {
      await this.ensureFolder(parts.join("/"));
    }

    const existing = this.app.vault.getAbstractFileByPath(normalPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(normalPath, content);
    }
  }

  private async ensureFolder(folderPath: string) {
    const existing = this.app.vault.getAbstractFileByPath(folderPath);
    if (!existing) {
      await this.app.vault.createFolder(folderPath);
    }
  }
}

// --- Helper modals ---

class DatePickerModal extends Modal {
  private title: string;
  private onSubmit: (dateStr: string) => Promise<void>;

  constructor(app: App, title: string, onSubmit: (dateStr: string) => Promise<void>) {
    super(app);
    this.title = title;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("whoop-date-modal");
    contentEl.createEl("h2", { text: this.title });

    let dateStr = formatDateUTC(new Date());
    new Setting(contentEl)
      .setName("Date (YYYY-MM-DD)")
      .addText((text) =>
        text
          .setValue(dateStr)
          .onChange((v) => { dateStr = v.trim(); })
      );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Generate")
        .setCta()
        .onClick(async () => {
          this.close();
          await this.onSubmit(dateStr);
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

class BackfillModal extends Modal {
  private onSubmit: (n: number) => Promise<void>;

  constructor(app: App, onSubmit: (n: number) => Promise<void>) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Backfill Daily Notes" });

    let n = 7;
    new Setting(contentEl)
      .setName("Number of days")
      .setDesc("Generates notes for the last N days, skipping any that already exist.")
      .addText((text) =>
        text
          .setValue("7")
          .onChange((v) => { n = parseInt(v) || 7; })
      );

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Backfill")
        .setCta()
        .onClick(async () => {
          this.close();
          await this.onSubmit(n);
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

/** Parse YYYY-MM-DD as UTC midnight. */
function parseLocalDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
}
