import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Warn, not error. The rule guards against cascading renders from state that
      // should have been derived. Every remaining instance in this app is an effect
      // synchronising with an external system it cannot read during render:
      // localStorage (SSR-safe only inside an effect), the Colyseus socket, and
      // fetch-loading flags. That is what effects are for, so an error-level rule
      // here would only be satisfied by suppressing it in fourteen places.
      // Kept visible as a warning so genuinely derivable state still gets flagged.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
