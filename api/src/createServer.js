import { config } from "#src/config/environment.js"
import storageManager from "#src/config/storageManager.js"
import { errorHandler, notFoundHandler } from "#src/middlewares/errorMiddleware.js"
import authRoutes from "#src/routes/authRoutes.js"
import collectionRoutes from "#src/routes/collectionRoutes.js"
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

  app.get("/health", (req, res) => {
    res.status(200).json({
      environment: config.NODE_ENV,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  })

  app.use(authRoutes)
  app.use(collectionRoutes)
  app.use(settingRoutes)
  app.use(imageRoutes)
  app.use(taskRoutes)

  storageManager.ensureDirectories()
  app.use("/uploads", express.static(storageManager.uploadsDir))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
