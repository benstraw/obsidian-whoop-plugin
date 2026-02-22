// Minimal mock of the obsidian module for unit tests.
// Only exports used by the modules under test are needed here.

export const requestUrl = async () => ({ status: 200, json: {} });
export class Modal {}
export class Plugin {}
export class PluginSettingTab {}
export class Notice {}
export class Setting {}
export class TFile {}
export const normalizePath = (p: string) => p;
