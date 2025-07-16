import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import fs from "fs"
import morgan from "morgan"

import { config } from "./config.js"
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js"
import authRoutes from "./routes/authRoutes.js"
import imageRoutes from "./routes/imageRoutes.js"
import settingRoutes from "./routes/settingRoutes.js"

export function createApi(options = {}) {
  const { enableLogging = true, uploadsDir = "uploads" } = options

  const app = express()

  app.use(express.json())
  app.use(cookieParser())

  if (enableLogging) {
    app.use(morgan("dev"))
  }

  app.use(
    cors({
      credentials: true,
      origin: config.CLIENT_BASE_URL
    })
  )

  app.use(authRoutes)
  app.use(settingRoutes)
  app.use(imageRoutes)

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  app.use("/uploads", express.static(uploadsDir))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
