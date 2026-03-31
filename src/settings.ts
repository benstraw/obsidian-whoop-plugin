import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type WhoopPlugin from "./main.ts";
import { AuthModal, TokenData } from "./auth.ts";

export interface WhoopSettings {
  clientId: string;
  clientSecret: string;
  outputFolder: string;
  tokens: TokenData | null;
}

export const DEFAULT_SETTINGS: WhoopSettings = {
  clientId: "",
  clientSecret: "",
  outputFolder: "Health/WHOOP",
  tokens: null,
};

export class WhoopSettingTab extends PluginSettingTab {
  plugin: WhoopPlugin;

  constructor(app: App, plugin: WhoopPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("whoop-settings");

    new Setting(containerEl).setName("WHOOP plugin settings").setHeading();

    // Connection status
    const statusEl = containerEl.createEl("p");
    statusEl.appendText("Status: ");
    if (this.plugin.settings.tokens) {
      statusEl.createSpan({ cls: "whoop-status-connected", text: "Connected" });
    } else {
      statusEl.createSpan({ cls: "whoop-status-disconnected", text: "Not connected" });
    }

    new Setting(containerEl).setName("API credentials").setHeading();
    containerEl.createEl("p", {
      text: "Get your credentials at developer.whoop.com. Create an app with redirect URI: obsidian://whoop-callback",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Client ID")
      .setDesc("Your WHOOP app client ID")
      .addText((text) =>
        text
          .setPlaceholder("Enter client ID…")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Client secret")
      .setDesc("Your WHOOP app client secret")
      .addText((text) => {
        text
          .setPlaceholder("Enter client secret…")
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl).setName("Authorization").setHeading();

    new Setting(containerEl)
      .setName("Connect to WHOOP")
      .setDesc(
        "Authorize this plugin to access your WHOOP data. You must have a client ID and secret configured above."
      )
      .addButton((btn) =>
        btn
          .setButtonText(
            this.plugin.settings.tokens ? "Re-authorize" : "Authorize with WHOOP"
          )
          .setCta()
          .onClick(() => {
            if (!this.plugin.settings.clientId || !this.plugin.settings.clientSecret) {
              new Notice("Please enter your Client ID and Client Secret first.");
              return;
            }
            new AuthModal(
              this.app,
              this.plugin.settings.clientId,
              this.plugin.settings.clientSecret,
              async (tokens) => {
                this.plugin.settings.tokens = tokens;
                await this.plugin.saveSettings();
                this.display(); // refresh to show connected status
              }
            ).open();
          })
      );

    if (this.plugin.settings.tokens) {
      new Setting(containerEl)
        .setName("Disconnect")
        .setDesc("Remove stored tokens and disconnect from WHOOP.")
        .addButton((btn) =>
          btn
            .setButtonText("Disconnect")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.tokens = null;
              await this.plugin.saveSettings();
              new Notice("Disconnected from WHOOP.");
              this.display();
            })
        );
    }

    new Setting(containerEl).setName("Output").setHeading();

    new Setting(containerEl)
      .setName("Output folder")
      .setDesc(
        "Vault folder where daily and weekly notes will be written. Year subfolders are created automatically."
      )
      .addText((text) =>
        text
          .setPlaceholder("Health/WHOOP")
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim().replace(/\/$/, "");
            await this.plugin.saveSettings();
          })
      );
  }
}
