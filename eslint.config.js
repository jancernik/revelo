import pluginJs from "@eslint/js"
import perfectionist from "eslint-plugin-perfectionist"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import pluginVue from "eslint-plugin-vue"
import globals from "globals"

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "**/uploads/", "ai/**"]
  },

  pluginJs.configs.recommended,
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
    files: ["client/**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      sourceType: "module"
    },
    rules: {
      "perfectionist/sort-switch-cases": "off",
      "vue/multi-word-component-names": "off"
    }
  },

  {
    files: ["client/vite.config.js", "client/vitest.config.js", "client/src/config/environment.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  eslintPluginPrettierRecommended
]
