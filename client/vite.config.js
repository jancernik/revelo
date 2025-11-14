import { config } from "#src/config/environment.js"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import vueDevTools from "vite-plugin-vue-devtools"

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "#src/styles/_index.scss" as *;`
      }
    }
  },
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      manifest: {
        background_color: "#000",
        description: "Image gallery by Jan Cernik",
        display: "standalone",
        icons: [
          {
            purpose: "maskable",
            sizes: "192x192",
            src: "/icons/192x192.png",
            type: "image/png"
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "/icons/512x512.png",
            type: "image/png"
          }
        ],
        lang: "en-US",
        name: "Revelo",
        scope: "/",
        short_name: "Revelo",
        start_url: "/",
        theme_color: "#000"
      },
      registerType: "autoUpdate"
    })
  ],
  resolve: {
    alias: {
      "#src": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    allowedHosts: ["dev.revelo.app"],
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
