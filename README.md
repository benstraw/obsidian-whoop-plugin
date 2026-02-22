# Obsidian WHOOP Plugin

Fetch your [WHOOP](https://www.whoop.com) fitness data and generate daily and weekly health notes directly in your Obsidian vault — no terminal, no scripts, no environment variables.

## Features

- **Daily notes** — recovery score, HRV, RHR, sleep stages, strain, and workouts
- **Weekly summaries** — aggregate stats, recovery distribution, workout table, and highlights
- **Batch backfill** — generate notes for the last N days in one click (skips existing notes)
- **Ribbon icon** — one-click note for today
- **OAuth2** — secure connection via the WHOOP API; tokens stored locally in your vault data

## Installation

### Community Plugin (recommended)

1. Open **Settings → Community Plugins → Browse**
2. Search for **WHOOP**
3. Install and enable

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/benstraw/obsidian-whoop-plugin/releases/latest)
2. Copy them to `<vault>/.obsidian/plugins/obsidian-whoop-plugin/`
3. Enable the plugin in **Settings → Community Plugins**

## Setup

### 1. Create a WHOOP developer app

1. Go to [developer.whoop.com](https://developer.whoop.com)
2. Create a new app
3. Add `obsidian://whoop-callback` as a **Redirect URI**
4. Copy your **Client ID** and **Client Secret**

### 2. Configure the plugin

1. Open **Settings → WHOOP**
2. Paste your Client ID and Client Secret
3. Click **Authorize with WHOOP**
4. Approve access in your browser — Obsidian will catch the callback automatically

### 3. Generate notes

Use the **command palette** (`Cmd/Ctrl+P`) and search for **WHOOP**:

| Command | Description |
|---|---|
| Generate today's daily note | Fetches today's data and writes a note |
| Generate daily note for a specific date… | Date picker |
| Generate current week's weekly note | 7-day aggregate |
| Generate weekly note for a specific week… | Date picker |
| Backfill last N days… | Batch generate (skips existing) |

Or click the **activity icon** in the ribbon for a one-click today's note.

## Note format

Notes are written to your configured output folder (default: `Health/WHOOP`) with the structure:

```
Health/WHOOP/
├── 2026/
│   ├── daily-2026-02-22.md
│   ├── daily-2026-02-21.md
│   └── weekly-2026-W08.md
```

Daily notes include:
- Frontmatter with tags and date
- Previous/next day and week navigation links
- Recovery score, HRV, RHR, SpO₂, skin temp
- Sleep stages (main sleep, additional sleeps, naps)
- Day strain and calorie burn
- Individual workout details

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production bundle
npm run test     # run tests
npm run lint     # type check
```

## License

MIT
