import pluginJs from "@eslint/js"
import perfectionist from "eslint-plugin-perfectionist"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import pluginVue from "eslint-plugin-vue"
import globals from "globals"
import tseslint from "typescript-eslint"

// JavaScript components not yet migrated to TypeScript.
const untypedComponents = ["client/src/components/common/FullscreenImage.vue"]

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "**/uploads/", "ai/**"]
  },

  { ...pluginJs.configs.recommended, files: ["**/*.js"] },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["client/**/*.{ts,vue}"],
    ignores: untypedComponents
  })),
  perfectionist.configs["recommended-natural"],
  ...pluginVue.configs["flat/recommended"],

  {
    files: ["api/**/*.js", "ai/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: "module"
    }
  },

  {
    files: ["api/**/*.test.js", "api/tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },

  {
    files: ["client/**/*.{js,ts,vue}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { parser: tseslint.parser },
      sourceType: "module"
    },
    rules: {
      "perfectionist/sort-switch-cases": "off",
      "vue/multi-word-component-names": "off"
    }
  },

  {
    files: ["client/vite.config.ts", "client/vitest.config.ts", "client/src/config/environment.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  eslintPluginPrettierRecommended
]
