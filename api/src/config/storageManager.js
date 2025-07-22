import { config } from "#src/config/environment.js"
import { AppError } from "#src/core/errors.js"
import fs from "fs/promises"
import path from "path"

class StorageManager {
  get stagingDir() {
    return this.paths.staging
  }

  get uploadsDir() {
    return this.paths.uploads
  }

  constructor() {
    this.initialized = false
    this.paths = {}
    this.initialize()
  }

  async cleanupTestFiles() {
    if (config.ENV !== "test") {
      console.warn("cleanupTestFiles should only be called in test environment")
      return
    }

    try {
      const testUploadsRoot = path.resolve("test-uploads")
      await fs.rm(testUploadsRoot, { force: true, recursive: true })
    } catch {
      // Do nothing
    }
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true })
      await fs.mkdir(this.stagingDir, { recursive: true })
    } catch (error) {
      throw new AppError("File system initialization failed", {
        data: { error },
        isOperational: false
      })
    }
  }

  getImageDirectory(imageId) {
    return path.join(this.uploadsDir, imageId.toString())
  }

  getImagePath(imageId, filename) {
    return path.join(this.uploadsDir, imageId.toString(), filename)
  }

  getStagingImagePath(sessionId, filename) {
    return path.join(this.stagingDir, `${sessionId}-${filename}`)
  }

  initialize() {
    if (this.initialized) return

    const isTest = config.ENV === "test"
    const uploadsDir = config.UPLOADS_DIR || (isTest ? "test-uploads" : "uploads")

    this.paths = {
      staging: path.join(uploadsDir, "staging"),
      uploads: uploadsDir
    }

    this.initialized = true
  }
}

export default new StorageManager()
