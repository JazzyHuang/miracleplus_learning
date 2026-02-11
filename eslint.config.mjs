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
          caughtErrorsIgnorePattern: "^_",
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Import 规则
      "import/no-duplicates": "error",

      // Next.js 规则
      "@next/next/no-img-element": "error",
    },
  },
  // 文件特定的 overrides
  {
    files: ["app/sw.ts"],
    rules: {
      "no-console": "off", // Service Worker 独立上下文，需要日志监控
    },
  },
  {
    files: ["components/admin/data-table/**/*.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off", // TanStack Table 与 React Compiler 不兼容
    },
  },
  {
    files: ["components/charts/lazy-charts.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // recharts 动态导入的复杂类型，使用 any 是合理的权衡
    },
  },
  {
    files: ["lib/offline-queue.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off", // IndexedDB 初始化后的非空断言是安全的，ensureDb() 保证 db 存在
    },
  },
]);

export default eslintConfig;
