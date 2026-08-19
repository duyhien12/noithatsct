import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "android/**",
  ]),
  {
    rules: {
      // Data-fetching useEffect with setState is intentional and valid in this codebase
      "react-hooks/set-state-in-effect": "off",
      // @typescript-eslint plugin not fully loaded in flat config
      "@typescript-eslint/no-require-imports": "off",
      // React Compiler rules (react-hooks v7) - compiler not enabled in next.config.mjs
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/globals": "off",
      "react-hooks/gating": "off",
    },
  },
]);

export default eslintConfig;
