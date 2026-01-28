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
  // 自定义规则
  {
    rules: {
      // React Hooks 规则
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      
      // 代码质量规则
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
      
      // TypeScript 规则
      "@typescript-eslint/no-unused-vars": [
        "error",
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // Import 规则
      "import/no-duplicates": "error",
      
      // Next.js 规则
      "@next/next/no-img-element": "error",
    },
  },
]);

export default eslintConfig;
