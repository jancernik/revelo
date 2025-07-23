import storageManager from "#src/config/storageManager.js"
import { AppError, FileProcessingError, NotFoundError } from "#src/core/errors.js"
import Image from "#src/models/Image.js"
import {
  generateImageCaption,
  generateImageEmbedding,
  generateTextEmbedding
} from "#src/services/aiService.js"
import { eq } from "drizzle-orm"
import exifr from "exifr"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import { v4 as uuid } from "uuid"

export const uploadForReview = async (file) => {
  const sessionId = uuid()
  const tempFilePath = storageManager.getStagingImagePath(sessionId, file.originalname)
  await fs.copyFile(file.path, tempFilePath)

  const metadata = await extractMetadata(tempFilePath)

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
    date: metadata.date ? new Date(metadata.date) : null,
    focalLength: metadata.focalLength || null,
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

  return image
}

export const extractMetadata = async (filePath) => {
  const raw = (await exifr.parse(filePath)) || {}
  return {
    aperture: raw.FNumber?.toString(),
    camera: (raw.Make || raw.Model) && `${raw.Make || ""}${raw.Model ? ` ${raw.Model}` : ""}`,
    date:
      (raw.DateTimeOriginal || raw.CreateDate) &&
      new Date(raw.DateTimeOriginal || raw.CreateDate).toISOString().split("T")[0],
    focalLength: raw.FocalLength?.toString(),
    iso: raw.ISO?.toString(),
    lens: raw.LensModel,
    shutterSpeed:
      raw.ExposureTime &&
      (raw.ExposureTime < 1 ? `1/${Math.round(1 / raw.ExposureTime)}` : `${raw.ExposureTime}`)
  }
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
  if (metadata.camera !== undefined) updateData.camera = metadata.camera
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

  return await Image.db.transaction(async (tx) => {
    await tx.delete(Image.table).where(eq(Image.table.id, id))

    const imageDir = storageManager.getImageDirectory(id)
    try {
      await fs.rm(imageDir, { force: true, recursive: true })
    } catch (error) {
      console.error(`Error deleting image files: ${error.message}`)
    }

    return true
  })
}

export const fetchByIdWithVersions = async (id) => {
  const image = await Image.findByIdWithVersions(id)

  if (!image) {
    throw new NotFoundError("Image not found")
  }

  return image
}

const generateEmbedding = async (image) => {
  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    const embedding = await generateImageEmbedding(originalVersion.path)

    await Image.db.update(Image.table).set({ embedding }).where(eq(Image.table.id, image.id))
  } catch (error) {
    throw new AppError("Failed to generate embedding for image", {
      data: { error },
      isOperational: false
    })
  }
}

const generateCaption = async (image) => {
  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    const caption = await generateImageCaption(originalVersion.path)

    await Image.db.update(Image.table).set({ caption }).where(eq(Image.table.id, image.id))
  } catch (error) {
    throw new AppError("Failed to generate caption for image", {
      data: { error },
      isOperational: false
    })
  }
}

export const searchWithVersions = async (text, options = {}) => {
  const MIN_SIMILARITY = 0.25
  const RANK_BONUS_FACTOR = 0.1
  const EMBEDDING_SCORE_WEIGHT = 0.7
  const TEXT_SCORE_WEIGHT = 0.3

  const { limit = 50 } = options

  const [embeddingResults, textResults] = await Promise.all([
    (async () => {
      const embedding = await generateTextEmbedding(text, { highPriority: true })
      return await Image.searchByEmbedding(embedding, {
        limit,
        minSimilarity: MIN_SIMILARITY
      })
    })(),
    Image.searchByText(text, { limit })
  ])

  const resultMap = new Map()

  const embeddingLength = embeddingResults.length
  embeddingResults.forEach((result, index) => {
    const rawEmbeddingScore = result.similarity
    const weightedEmbeddingScore = rawEmbeddingScore * EMBEDDING_SCORE_WEIGHT
    const rankBonus =
      embeddingLength > 0 ? ((embeddingLength - index) / embeddingLength) * RANK_BONUS_FACTOR : 0

    resultMap.set(result.id, {
      ...result,
      embeddingScore: rawEmbeddingScore,
      finalScore: weightedEmbeddingScore + rankBonus,
      scoreBreakdown: {
        embedding: weightedEmbeddingScore,
        rankBonus,
        text: 0
      },
      source: "embedding",
      textScore: 0
    })
  })

  const textLength = textResults.length
  textResults.forEach((result, index) => {
    const rawTextScore = result.score ?? 0
    const weightedTextScore = rawTextScore * TEXT_SCORE_WEIGHT
    const rankBonus = textLength > 0 ? ((textLength - index) / textLength) * RANK_BONUS_FACTOR : 0

    if (resultMap.has(result.id)) {
      const existing = resultMap.get(result.id)
      const finalScore =
        existing.embeddingScore * EMBEDDING_SCORE_WEIGHT + weightedTextScore + rankBonus

      resultMap.set(result.id, {
        ...existing,
        finalScore,
        scoreBreakdown: {
          embedding: existing.embeddingScore * EMBEDDING_SCORE_WEIGHT,
          rankBonus,
          text: weightedTextScore
        },
        source: "hybrid",
        textScore: rawTextScore
      })
    } else {
      resultMap.set(result.id, {
        ...result,
        embeddingScore: 0,
        finalScore: weightedTextScore + rankBonus,
        scoreBreakdown: {
          embedding: 0,
          rankBonus,
          text: weightedTextScore
        },
        source: "text",
        textScore: rawTextScore
      })
    }
  })

  const combinedResults = Array.from(resultMap.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit)

  return combinedResults
}
