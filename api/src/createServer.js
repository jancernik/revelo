import { config } from "#src/config/environment.js"
import storageManager from "#src/config/storageManager.js"
import { errorHandler, notFoundHandler } from "#src/middlewares/errorMiddleware.js"
import authRoutes from "#src/routes/authRoutes.js"
import imageRoutes from "#src/routes/imageRoutes.js"
import settingRoutes from "#src/routes/settingRoutes.js"
import taskRoutes from "#src/routes/taskRoutes.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import morgan from "morgan"

export function createServer(options = {}) {
  const { enableLogging = true } = options

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
  app.use(taskRoutes)

  storageManager.ensureDirectories()
  app.use("/uploads", express.static(storageManager.uploadsDir))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
