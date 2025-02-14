import eslint from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import { includeIgnoreFile } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, "../.gitignore");

const eslintrc = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...eslintrc.extends("plugin:vue/vue3-recommended", "prettier"),
  eslint.configs.recommended,
  includeIgnoreFile(gitignorePath),
  {
    ignores: ["node_modules/*", "dist/*", "**/*.config.js", '**/pnpm-lock.yaml'],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["*.vue"],
    languageOptions: {
      parser: "vue-eslint-parser",
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-unused-vars": "warn",
      "vue/html-self-closing": [
        "error",
        {
          html: {
            void: "always",
            normal: "never",
            component: "always",
          },
        },
      ]
    },
  },
];
