import fs from "fs/promises"
import path from "path"

class LocalStorageAdapter {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir
  }

  async deleteDirectory(dirPath) {
    try {
      console.log(`Deleting directory: ${dirPath}`)
      await fs.rm(dirPath, { force: true, recursive: true })
      console.log(`Successfully deleted directory: ${dirPath}`)
    } catch (error) {
      console.log(`Error deleting directory ${dirPath}: ${error.message}`)
      throw error
    }
  }

  async ensureDirectories() {
    await fs.mkdir(this.uploadsDir, { recursive: true })
  }

  getReadablePath(filePath) {
    return path.resolve(filePath)
  }

  isLocal() {
    return true
  }

  async readFile(filePath) {
    return await fs.readFile(filePath)
  }

  async writeFile(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, data)
  }
}

export default LocalStorageAdapter
