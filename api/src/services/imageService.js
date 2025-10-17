import { config } from "#src/config/environment.js"
import { AppError, FileProcessingError, NotFoundError } from "#src/core/errors.js"
import Image from "#src/models/Image.js"
import {
  generateImageCaption,
  generateImageEmbedding,
  generateTextEmbedding
} from "#src/services/aiService.js"
import storageManager from "#src/storage/storageManager.js"
import { eq } from "drizzle-orm"
import exifr from "exifr"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import { v4 as uuid } from "uuid"

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

  generateEmbedding(image)
  generateCaption(image)

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

export const updateImageMetadata = async (id, metadata) => {
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  const updateData = {}

  if (metadata.iso !== undefined) updateData.iso = metadata.iso ? parseInt(metadata.iso, 10) : null
  if (metadata.aperture !== undefined) updateData.aperture = metadata.aperture
  if (metadata.shutterSpeed !== undefined) updateData.shutterSpeed = metadata.shutterSpeed
  if (metadata.focalLength !== undefined) updateData.focalLength = metadata.focalLength
  if (metadata.focalLengthEquivalent !== undefined)
    updateData.focalLengthEquivalent = metadata.focalLengthEquivalent
  if (metadata.camera !== undefined) updateData.camera = metadata.camera
  if (metadata.comment !== undefined) updateData.comment = metadata.comment
  if (metadata.lens !== undefined) updateData.lens = metadata.lens
  if (metadata.date !== undefined) {
    updateData.date = metadata.date ? new Date(metadata.date) : null
  }

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

export const fetchByIdWithVersions = async (id) => {
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  return image
}

export const generateEmbedding = async (image) => {
  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    let imagePath = originalVersion.path

    if (!storageManager.isLocalStorage()) {
      const tempPath = path.join(storageManager.stagingDir, `temp-${image.id}-embedding.jpg`)
      const data = await storageManager.adapter.readFile(originalVersion.path)
      await fs.writeFile(tempPath, data)
      imagePath = tempPath
    }

    const embedding = await generateImageEmbedding(imagePath)
    await Image.db.update(Image.table).set({ embedding }).where(eq(Image.table.id, image.id))

    if (!storageManager.isLocalStorage()) await fs.unlink(imagePath)
  } catch (error) {
    throw new AppError("Failed to generate embedding for image", {
      data: { error },
      isOperational: false
    })
  }
}

export const generateCaption = async (image) => {
  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    let imagePath = originalVersion.path

    if (!storageManager.isLocalStorage()) {
      const tempPath = path.join(storageManager.stagingDir, `temp-${image.id}-caption.jpg`)
      const data = await storageManager.adapter.readFile(originalVersion.path)
      await fs.writeFile(tempPath, data)
      imagePath = tempPath
    }

    const caption = await generateImageCaption(imagePath)
    await Image.db.update(Image.table).set({ caption }).where(eq(Image.table.id, image.id))

    if (!storageManager.isLocalStorage()) await fs.unlink(imagePath)
  } catch (error) {
    throw new AppError("Failed to generate caption for image", {
      data: { error },
      isOperational: false
    })
  }
}

export const searchWithVersions = async (text, options = {}) => {
  const { candidateK = 200, efSearch = 200, limit = 50, useDynamicThreshold = true } = options

  const [embeddingResults, textResults] = await Promise.all([
    (async () => {
      const embedding = await generateTextEmbedding(text, { highPriority: true })
      return await Image.searchByEmbedding(embedding, {
        efSearch,
        limit: candidateK,
        minSimilarity: 0.25
      })
    })(),
    Image.searchByText(text, { limit: candidateK })
  ])

  const rankMapEmbed = new Map()
  embeddingResults.forEach((r, i) => rankMapEmbed.set(r.id, i + 1))
  const rankMapText = new Map()
  textResults.forEach((r, i) => rankMapText.set(r.id, i + 1))

  const embedScores = embeddingResults.map((r) => r.similarity ?? 0)
  const minE = Math.min(...embedScores, 0)
  const maxE = Math.max(...embedScores, 1e-9)
  const normEmbed = new Map()
  embeddingResults.forEach((r) => {
    const n = maxE > minE ? (r.similarity - minE) / (maxE - minE) : 0
    normEmbed.set(r.id, n)
  })

  const textScores = textResults.map((r) => r.score ?? 0)
  const minT = Math.min(...textScores, 0)
  const maxT = Math.max(...textScores, 1e-9)
  const normText = new Map()
  textResults.forEach((r) => {
    const n = maxT > minT ? (r.score - minT) / (maxT - minT) : 0
    normText.set(r.id, n)
  })

  const RRF_K = 60
  const allIds = new Set([...rankMapEmbed.keys(), ...rankMapText.keys()])

  const fused = []
  for (const id of allIds) {
    const r1 = rankMapEmbed.get(id)
    const r2 = rankMapText.get(id)
    const rrf = (r1 ? 1 / (RRF_K + r1) : 0) + (r2 ? 1 / (RRF_K + r2) : 0)

    fused.push({
      id,
      rrf,
      scoreBreakdown: {
        embeddingNorm: normEmbed.get(id) ?? 0,
        embeddingRank: r1 ?? null,
        rrf,
        textNorm: normText.get(id) ?? 0,
        textRank: r2 ?? null
      },
      source: r1 && r2 ? "hybrid" : r1 ? "embedding" : "text"
    })
  }

  if (useDynamicThreshold) {
    const rrfVals = fused.map((f) => f.rrf)
    const mean = rrfVals.reduce((a, b) => a + b, 0) / Math.max(rrfVals.length, 1)
    const stdev = Math.sqrt(
      rrfVals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(rrfVals.length, 1)
    )
    const floor = Math.max(mean - 0.5 * stdev, 0)

    const KEEP_NORM = 0.15

    fused.sort((a, b) => b.rrf - a.rrf)
    const filtered = fused.filter(
      (f) =>
        f.rrf >= floor ||
        f.scoreBreakdown.embeddingNorm >= KEEP_NORM ||
        f.scoreBreakdown.textNorm >= KEEP_NORM
    )
    fused.length = 0
    fused.push(...filtered)
  }

  const hydrated = []
  const byIdEmbed = new Map(embeddingResults.map((r) => [r.id, r]))
  const byIdText = new Map(textResults.map((r) => [r.id, r]))

  fused.sort((a, b) => b.rrf - a.rrf)
  for (const f of fused.slice(0, limit)) {
    hydrated.push(byIdEmbed.get(f.id) || byIdText.get(f.id))
  }

  const byIdBreakdown = new Map(fused.map((f) => [f.id, f.scoreBreakdown]))
  const finalResults = hydrated.map((r) => ({
    ...r,
    scoreBreakdown: byIdBreakdown.get(r.id)
  }))

  return finalResults
}
