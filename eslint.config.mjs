import tsParser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["src/__tests__/**"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: { obsidianmd },
    rules: {
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          // WHOOP is the official all-caps brand name
          // YYYY-MM-DD is a date format placeholder, not prose
          ignoreRegex: ["WHOOP", "YYYY-MM-DD"],
        },
      ],
      "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
      "obsidianmd/commands/no-plugin-name-in-command-name": "error",
    },
  },
];
