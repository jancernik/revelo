import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vueDevTools from "vite-plugin-vue-devtools"
import "dotenv/config"

const requiredEnvVars = ["VITE_API_BASE_URL", "VITE_CLIENT_BASE_URL"]
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  process.exit(1)
}

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
    proxy: {
      "/api": {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        target: process.env.VITE_API_BASE_URL
      }
    }
  }
})
