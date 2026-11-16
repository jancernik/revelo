import fs from "fs/promises"
import path from "path"

import Image from "#src/models/Image.js"
import { indexDescriptions, indexSearchEmbeddings } from "#src/services/indexService.js"
import storageManager from "#src/storage/storageManager.js"

export const cleanupStagedImages = async () => {
  const tempFiles = await fs.readdir(storageManager.stagingDir)

  const timeThreshold = Date.now() - 1 * 60 * 60 * 1000

  let deletedCount = 0
  let errorCount = 0

  for (const file of tempFiles) {
    const filePath = path.join(storageManager.stagingDir, file)

    try {
      const stats = await fs.stat(filePath)
      if (stats.mtime.getTime() < timeThreshold) {
        await fs.unlink(filePath)
        deletedCount++
      }
    } catch (error) {
      console.error(`Error processing temp file ${file}: ${error.message}`)
      errorCount++
    }
  }

  return {
    deleted: deletedCount,
    errors: errorCount,
    scanned: tempFiles.length
  }
}

export const cleanupOrphanedImages = async () => {
  const images = await Image.findAllWithVersions()

  const validPaths = new Set()

  for (const image of images) {
    for (const version of image.versions) {
      validPaths.add(version.path)
    }
  }

  const uploadDirs = await fs.readdir(storageManager.uploadsDir, { withFileTypes: true })

  let scannedCount = 0
  let deletedCount = 0
  let errorCount = 0

  for (const dir of uploadDirs) {
    if (dir.name === "staging" || !dir.isDirectory()) {
      continue
    }

    const imageId = dir.name

    if (!images.some((img) => img.id === imageId)) {
      try {
        const dirPath = path.join(storageManager.uploadsDir, dir.name)
        await fs.rm(dirPath, { force: true, recursive: true })
        deletedCount++
      } catch (err) {
        console.error(`Error deleting orphaned directory ${dir.name}: ${err.message}`)
        errorCount++
      }
      continue
    }

    const imageDir = path.join(storageManager.uploadsDir, dir.name)
    const files = await fs.readdir(imageDir)
    let hasValidFiles = false

    for (const file of files) {
      scannedCount++
      const relativePath = path.join("uploads", dir.name, file)

      if (validPaths.has(relativePath)) {
        hasValidFiles = true
        break
      }
    }

    if (!hasValidFiles) {
      try {
        const dirPath = path.join(storageManager.uploadsDir, dir.name)
        await fs.rm(dirPath, { force: true, recursive: true })
        deletedCount++
      } catch (err) {
        console.error(`Error deleting orphaned directory ${dir.name}: ${err.message}`)
        errorCount++
      }
    }
  }

  return {
    deleted: deletedCount,
    errors: errorCount,
    scanned: scannedCount
  }
}

export const backfillEmbeddings = async (force = false) => {
  return await indexSearchEmbeddings({ force })
}

export const backfillDescriptions = async (force = false) => {
  return await indexDescriptions({ force })
}
