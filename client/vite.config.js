import { config } from "#src/config/environment.js"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vueDevTools from "vite-plugin-vue-devtools"

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "#src/styles/_index.scss" as *;`
      }
    }
  },
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      "#src": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    host: true,
    port: parseInt(config.CLIENT_PORT) || 5173,
    proxy: {
      "/api": {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        target: config.API_BASE_URL
      }
    }
  }
})
