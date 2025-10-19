import { config } from "#src/config/environment.js"
import { AppError } from "#src/core/errors.js"
import LocalStorageAdapter from "#src/storage/LocalStorageAdapter.js"
import S3StorageAdapter from "#src/storage/S3StorageAdapter.js"
import fs from "fs/promises"
import path from "path"

class StorageManager {
  get adapter() {
    return this.storageAdapter
  }

  get stagingDir() {
    return this.paths.staging
  }

  get uploadsDir() {
    return this.paths.uploads
  }

  constructor() {
    this.initialized = false
    this.paths = {}
    this.storageAdapter = null
    this.initialize()
  }

  async cleanupTestFiles() {
    if (config.ENV !== "test") {
      console.log("cleanupTestFiles should only be called in test environment")
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
      await fs.mkdir(this.stagingDir, { recursive: true })
      await this.storageAdapter.ensureDirectories()
    } catch (error) {
      throw new AppError("File system initialization failed", {
        data: { error },
        isOperational: false
      })
    }
  }

  getAdapterForStorageType(storageType) {
    if (storageType === "local") {
      if (this.storageAdapter.isLocal()) {
        return this.storageAdapter
      }
      return new LocalStorageAdapter(this.uploadsDir)
    } else if (storageType === "s3") {
      if (!this.storageAdapter.isLocal()) {
        return this.storageAdapter
      }
      return new S3StorageAdapter({
        accessKeyId: config.BUCKET_ACCESS_KEY_ID,
        bucket: config.BUCKET_NAME,
        endpoint: config.BUCKET_ENDPOINT,
        publicUrl: config.BUCKET_PUBLIC_URL,
        region: config.BUCKET_REGION,
        secretAccessKey: config.BUCKET_SECRET_ACCESS_KEY
      })
    }
    throw new Error(`Unknown storage type: ${storageType}`)
  }

  getImageDirectory(imageId) {
    return path.join(this.uploadsDir, imageId.toString())
  }

  getImagePath(imageId, filename) {
    return path.join(this.uploadsDir, imageId.toString(), filename)
  }

  getPublicUrl(filePath) {
    return this.storageAdapter.getPublicUrl(filePath)
  }

  getPublicUrlForS3(filePath) {
    if (config.BUCKET_PUBLIC_URL) {
      const key = filePath.replace(/^\/+/, "").replace(/\\/g, "/")
      return `${config.BUCKET_PUBLIC_URL}/${key}`
    }
    return this.storageAdapter.isLocal() ? filePath : this.storageAdapter.getPublicUrl(filePath)
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

    if (config.STORAGE_TYPE === "s3" && this.#validateS3Config()) {
      this.storageAdapter = new S3StorageAdapter({
        accessKeyId: config.BUCKET_ACCESS_KEY_ID,
        bucket: config.BUCKET_NAME,
        endpoint: config.BUCKET_ENDPOINT,
        publicUrl: config.BUCKET_PUBLIC_URL,
        region: config.BUCKET_REGION,
        secretAccessKey: config.BUCKET_SECRET_ACCESS_KEY
      })
      console.log(`Storage initialized: S3 (bucket: ${config.BUCKET_NAME})`)
    } else {
      this.storageAdapter = new LocalStorageAdapter(uploadsDir)
      console.log(`Storage initialized: Local (path: ${uploadsDir})`)
    }

    this.initialized = true
  }

  isLocalStorage() {
    return this.storageAdapter.isLocal()
  }

  #validateS3Config() {
    const required = [
      "BUCKET_ENDPOINT",
      "BUCKET_ACCESS_KEY_ID",
      "BUCKET_SECRET_ACCESS_KEY",
      "BUCKET_NAME"
    ]
    const missing = required.filter((key) => !config[key])

    if (missing.length > 0) {
      console.log(
        `S3 configuration incomplete. Missing: ${missing.join(
          ", "
        )}. Falling back to local storage.`
      )
      return false
    }

    return true
  }
}

export default new StorageManager()
