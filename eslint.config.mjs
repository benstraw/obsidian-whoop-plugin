import tsParser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

// Replicate the recommended config but with ignoreRegex for WHOOP (official
// all-caps brand name) and YYYY-MM-DD (date format placeholder).
const { "obsidianmd/no-plugin-as-component": _skip, ...recommendedRules } =
  obsidianmd.configs.recommended;

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["src/__tests__/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: { obsidianmd },
    rules: {
      ...recommendedRules,
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          enforceCamelCaseLower: true,
          // WHOOP is the official all-caps brand name
          // YYYY-MM-DD is a date format placeholder, not prose
          ignoreRegex: ["WHOOP", "YYYY-MM-DD"],
        },
      ],
    },
  },
];
