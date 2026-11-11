import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This project loads API data from effects; keep lint focused on actual hook dependency bugs.
      "react-hooks/set-state-in-effect": "off",
      // Context modules commonly export both the provider component and the matching hook.
      "react-refresh/only-export-components": "off",
      // Enforce exhaustive deps in useEffect/useCallback/useMemo to prevent stale closures.
      "react-hooks/exhaustive-deps": "warn",
      // Prevent unused variables that are prefixed with underscore.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);