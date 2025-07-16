import globals from "globals"
import pluginJs from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import perfectionist from "eslint-plugin-perfectionist"
import pluginVue from "eslint-plugin-vue"

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "**/uploads/", "clip/"]
  },

  pluginJs.configs.recommended,

  {
    files: ["api/**/*.js"],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: "module"
    },
    plugins: {
      perfectionist
    },
    rules: {
      "perfectionist/sort-imports": "warn",
      "perfectionist/sort-named-imports": "warn"
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

  ...pluginVue.configs["flat/recommended"],
  {
    files: ["client/**/*.{js,vue}"],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      "vue/multi-word-component-names": "off"
    }
  },

  {
    files: ["client/vite.config.js", "client/vitest.config.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  eslintPluginPrettierRecommended
]
