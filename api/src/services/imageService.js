import archiver from "archiver"
import { eq, inArray } from "drizzle-orm"
import exifr from "exifr"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import { v4 as uuid } from "uuid"

import { config } from "#src/config/environment.js"
import { FileProcessingError, NotFoundError } from "#src/core/errors.js"
import Image from "#src/models/Image.js"
import { requestPass } from "#src/services/indexService.js"
import storageManager from "#src/storage/storageManager.js"

const mimeTypes = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
}

export const uploadForReview = async (file, options = {}) => {
  const sessionId = uuid()
  const tempFilePath = storageManager.getStagingImagePath(sessionId, file.originalname)
  await fs.copyFile(file.path, tempFilePath)

  const metadata = await extractMetadata(tempFilePath, options)

  await fs.unlink(file.path)

  return {
    filePath: tempFilePath,
    metadata,
    sessionId
  }
}

export const confirmUpload = async (sessionId, metadata) => {
  const tempFiles = await fs.readdir(storageManager.stagingDir)
  const sessionFile = tempFiles.find((file) => file.startsWith(sessionId))

  if (!sessionFile) {
    throw new NotFoundError("Upload session expired or not found")
  }

  const tempFilePath = path.join(storageManager.stagingDir, sessionFile)
  const originalFilename = sessionFile
    .split(`${sessionId}-`)[1]
    .replace(/\.[^.]+$/, (ext) => ext.toLowerCase())

  const imageMetadata = {
    aperture: metadata.aperture || null,
    camera: metadata.camera || null,
    comment: metadata.comment || null,
    date: metadata.date ? new Date(metadata.date) : null,
    focalLength: metadata.focalLength || null,
    focalLengthEquivalent: metadata.focalLengthEquivalent || null,
    iso: metadata.iso || null,
    lens: metadata.lens || null,
    originalFilename,
    shutterSpeed: metadata.shutterSpeed || null
  }

  const file = {
    mimetype: `image/${(await sharp(tempFilePath).metadata())?.format?.toLowerCase()}`,
    originalname: originalFilename,
    path: tempFilePath,
    size: (await fs.stat(tempFilePath)).size
  }

  const image = await Image.createWithVersions(file, imageMetadata)

  requestPass()

  return Image.transformImageWithUrls(image)
}

const applyMetadataReplacements = (metadata, replaceCameraNames = [], replaceLensNames = []) => {
  const updatedMetadata = { ...metadata }

  if (updatedMetadata.camera && replaceCameraNames.length > 0) {
    for (const [original, replacement] of replaceCameraNames) {
      if (original && updatedMetadata.camera.includes(original)) {
        updatedMetadata.camera = updatedMetadata.camera.replace(original, replacement)
      }
    }
  }

  if (updatedMetadata.lens && replaceLensNames.length > 0) {
    for (const [original, replacement] of replaceLensNames) {
      if (original && updatedMetadata.lens.includes(original)) {
        updatedMetadata.lens = updatedMetadata.lens.replace(original, replacement)
      }
    }
  }

  return updatedMetadata
}

export const extractMetadata = async (filePath, options = {}) => {
  const { replaceCameraNames = [], replaceLensNames = [] } = options

  const raw = (await exifr.parse(filePath)) || {}
  const metadata = {
    aperture: raw.FNumber?.toString(),
    camera: (raw.Make || raw.Model) && `${raw.Make || ""}${raw.Model ? ` ${raw.Model}` : ""}`,
    date:
      (raw.DateTimeOriginal || raw.CreateDate) &&
      new Date(raw.DateTimeOriginal || raw.CreateDate).toISOString().split("T")[0],
    focalLength: raw.FocalLength?.toString(),
    focalLengthEquivalent: raw.FocalLengthIn35mmFormat?.toString(),
    iso: raw.ISO?.toString(),
    lens: raw.LensModel,
    shutterSpeed: raw.ExposureTime?.toString()
  }

  return applyMetadataReplacements(metadata, replaceCameraNames, replaceLensNames)
}

const buildMetadataUpdate = (metadata) => {
  const updateData = {}

  if (metadata.iso !== undefined) updateData.iso = metadata.iso ? parseInt(metadata.iso, 10) : null
  if (metadata.aperture !== undefined) updateData.aperture = metadata.aperture
  if (metadata.shutterSpeed !== undefined) updateData.shutterSpeed = metadata.shutterSpeed
  if (metadata.focalLength !== undefined) updateData.focalLength = metadata.focalLength
  if (metadata.focalLengthEquivalent !== undefined)
    updateData.focalLengthEquivalent = metadata.focalLengthEquivalent
  if (metadata.camera !== undefined) updateData.camera = metadata.camera
  if (metadata.comment !== undefined) updateData.comment = metadata.comment
  if (metadata.hidden !== undefined) updateData.hidden = metadata.hidden
  if (metadata.lens !== undefined) updateData.lens = metadata.lens
  if (metadata.date !== undefined) updateData.date = metadata.date ? new Date(metadata.date) : null

  return updateData
}

export const updateImageMetadata = async (id, metadata) => {
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  const updateData = buildMetadataUpdate(metadata)

  const result = await Image.db
    .update(Image.table)
    .set(updateData)
    .where(eq(Image.table.id, id))
    .returning()

  if (!result.length) {
    throw new FileProcessingError("Failed to update image metadata")
  }

  return await Image.findByIdWithVersions(id)
}

export const deleteImage = async (id) => {
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  const imageDir = storageManager.getImageDirectory(id)
  const storageType = image.versions?.[0]?.storageType || "local"

  await Image.db.transaction(async (tx) => {
    await tx.delete(Image.table).where(eq(Image.table.id, id))
  })

  try {
    if (storageType === "s3") {
      const S3StorageAdapter = (await import("#src/storage/S3StorageAdapter.js")).default

      if (
        config.BUCKET_ENDPOINT &&
        config.BUCKET_ACCESS_KEY_ID &&
        config.BUCKET_SECRET_ACCESS_KEY &&
        config.BUCKET_NAME
      ) {
        const s3Adapter = new S3StorageAdapter({
          accessKeyId: config.BUCKET_ACCESS_KEY_ID,
          bucket: config.BUCKET_NAME,
          endpoint: config.BUCKET_ENDPOINT,
          publicUrl: config.BUCKET_PUBLIC_URL,
          region: config.BUCKET_REGION,
          secretAccessKey: config.BUCKET_SECRET_ACCESS_KEY
        })
        await s3Adapter.deleteDirectory(imageDir)
      } else {
        console.log(`Cannot delete S3 files for ${id}: S3 credentials not configured`)
      }
    } else {
      const LocalStorageAdapter = (await import("#src/storage/LocalStorageAdapter.js")).default
      const localAdapter = new LocalStorageAdapter(storageManager.uploadsDir)
      await localAdapter.deleteDirectory(imageDir)
    }
  } catch (error) {
    console.log(`Failed to delete image files for ${id}: ${error.message}`)
  }

  return true
}

export const deleteImages = async (ids) => {
  await Promise.all(
    ids.map((id) =>
      deleteImage(id).catch((error) => {
        if (!(error instanceof NotFoundError)) throw error
      })
    )
  )
  return true
}

export const bulkUpdateImageMetadata = async (ids, metadata) => {
  const updateData = buildMetadataUpdate(metadata)

  if (Object.keys(updateData).length === 0) return []

  await Image.db.update(Image.table).set(updateData).where(inArray(Image.table.id, ids))
  return Image.findAllWithVersions({ where: inArray(Image.table.id, ids) })
}

export const fetchByIdWithVersions = async (id, options = {}) => {
  const { includeHidden = false } = options
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  if (!includeHidden && image.hidden) {
    throw new NotFoundError("Image not found")
  }

  return image
}

export const downloadImage = async (id) => {
  const image = await Image.findByIdWithVersionsRaw(id, { columns: { originalFilename: true } })
  if (!image) throw new NotFoundError("Image not found")

  const originalVersion = image.versions?.find((v) => v.type === "original")
  if (!originalVersion) throw new NotFoundError("Image file not found")

  const adapter = storageManager.getAdapterForStorageType(originalVersion.storageType)
  const extension = path.extname(originalVersion.path).slice(1).toLowerCase() || "jpg"
  const filename = image.originalFilename ? image.originalFilename : `${image.id}.${extension}`
  const contentType = mimeTypes[extension] || "application/octet-stream"
  const buffer = await adapter.readFile(originalVersion.path)

  return { buffer, contentType, filename }
}

export const getImageFileEntry = async (image) => {
  try {
    const originalVersion = image.versions?.find((v) => v.type === "original")
    if (!originalVersion) return null

    const adapter = storageManager.getAdapterForStorageType(originalVersion.storageType)
    const extension = path.extname(originalVersion.path).slice(1).toLowerCase() || "jpg"
    const filename = image.originalFilename ? image.originalFilename : `${image.id}.${extension}`

    if (adapter.isLocal())
      return { filename, localPath: adapter.getReadablePath(originalVersion.path) }

    const buffer = await adapter.readFile(originalVersion.path)
    return { buffer, filename }
  } catch {
    return null
  }
}

export const appendEntriesToArchive = (archive, entries, folder = "") => {
  const usedNames = new Set()

  for (const entry of entries) {
    if (!entry) continue

    const baseName = folder ? `${folder}/${entry.filename}` : entry.filename
    let name = baseName

    if (usedNames.has(name)) {
      const ext = path.extname(baseName)
      const stem = baseName.slice(0, baseName.length - ext.length)
      let counter = 1
      while (usedNames.has(`${stem} (${counter})${ext}`)) counter++
      name = `${stem} (${counter})${ext}`
    }

    usedNames.add(name)
    if (entry.localPath) archive.file(entry.localPath, { name })
    else archive.append(entry.buffer, { name })
  }
}

export const downloadImages = async (ids) => {
  const images = await Image.findAllWithVersionsRaw({
    columns: { originalFilename: true },
    where: inArray(Image.table.id, ids)
  })
  const archive = archiver("zip", { zlib: { level: 6 } })

  appendEntriesToArchive(archive, await Promise.all(images.map(getImageFileEntry)))

  return archive
}
