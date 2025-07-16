import globals from "globals"
import pluginJs from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import perfectionist from "eslint-plugin-perfectionist"
import pluginVue from "eslint-plugin-vue"

export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "**/uploads/", "clip/"]
  },

  // Base JS config
  pluginJs.configs.recommended,

  // API-specific config
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
      // Only enable some perfectionist rules to avoid being too strict
      "perfectionist/sort-imports": "warn",
      "perfectionist/sort-named-imports": "warn"
    }
  },

  // API test files - add Jest globals
  {
    files: ["api/**/*.test.js", "api/tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },

  // Client Vue config
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

  // Client config files - add Node.js globals for build tools
  {
    files: ["client/vite.config.js", "client/vitest.config.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  // Prettier config (should be last)
  eslintPluginPrettierRecommended
]
