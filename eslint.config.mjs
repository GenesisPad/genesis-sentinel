import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/_legacy-foundation-app/**",
      "*.config.mjs",
      "vitest.config.ts",
      "**/prisma.config.ts",
      "eslint.config.mjs",
      "apps/web/*.config.mjs",
      "pnpm-lock.yaml"
    ]
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "apps/web/*.mjs", "scripts/*.mjs"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error"
    }
  },
  eslintConfigPrettier
);
