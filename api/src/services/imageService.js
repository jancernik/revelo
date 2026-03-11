import { config } from "#src/config/environment.js"
import { AppError, FileProcessingError, NotFoundError } from "#src/core/errors.js"
import Image from "#src/models/Image.js"
import {
  checkAiServiceHealth,
  generateImageCaption,
  generateImageEmbedding,
  generateTextEmbedding
} from "#src/services/aiService.js"
import storageManager from "#src/storage/storageManager.js"
import archiver from "archiver"
import { eq, inArray } from "drizzle-orm"
import exifr from "exifr"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import { v4 as uuid } from "uuid"

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

export const generateEmbedding = async (image) => {
  const isHealthy = await checkAiServiceHealth()
  if (!isHealthy) {
    return
  }

  let tempPath = null

  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    const adapter = storageManager.getAdapterForStorageType(originalVersion.storageType)
    let imagePath = adapter.getReadablePath(originalVersion.path)

    if (!imagePath) {
      tempPath = path.join(storageManager.stagingDir, `temp-${image.id}-embedding.jpg`)
      const data = await adapter.readFile(originalVersion.path)
      await fs.writeFile(tempPath, data)
      imagePath = tempPath
    }

    const embedding = await generateImageEmbedding(imagePath)
    await Image.db.update(Image.table).set({ embedding }).where(eq(Image.table.id, image.id))
  } catch (error) {
    throw new AppError("Failed to generate embedding for image", {
      data: { error },
      isOperational: false
    })
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath)
      } catch {
        // Do nothing
      }
    }
  }
}

export const generateCaption = async (image) => {
  const isHealthy = await checkAiServiceHealth()
  if (!isHealthy) {
    return
  }

  let tempPath = null

  try {
    const originalVersion = image?.versions?.find((v) => v.type === "original")
    if (!originalVersion) {
      throw new AppError("Original version not found", { isOperational: false })
    }

    const adapter = storageManager.getAdapterForStorageType(originalVersion.storageType)
    let imagePath = adapter.getReadablePath(originalVersion.path)

    if (!imagePath) {
      tempPath = path.join(storageManager.stagingDir, `temp-${image.id}-caption.jpg`)
      const data = await adapter.readFile(originalVersion.path)
      await fs.writeFile(tempPath, data)
      imagePath = tempPath
    }

    const captions = await generateImageCaption(imagePath)
    await Image.db.update(Image.table).set({ captions }).where(eq(Image.table.id, image.id))
  } catch (error) {
    throw new AppError("Failed to generate captions for image", {
      data: { error },
      isOperational: false
    })
  } finally {
    if (tempPath) {
      try {
        await fs.unlink(tempPath)
      } catch {
        // Do nothing
      }
    }
  }
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

export const searchWithVersions = async (text, options = {}) => {
  const {
    candidateK = 200,
    efSearch = 200,
    includeHidden = false,
    limit = 50,
    minSimilarity = 0.27,
    useDynamicThreshold = true
  } = options

  console.log(`Search query: "${text}"`)
  console.log(
    `Search params - candidateK=${candidateK}, efSearch=${efSearch}, limit=${limit}, minSimilarity=${minSimilarity}`
  )

  const isAiHealthy = await checkAiServiceHealth()
  console.log(`AI service health: ${isAiHealthy ? "healthy" : "unavailable"}`)

  let embeddingResults = []
  let textResults = []

  if (isAiHealthy) {
    const [embeddingResult, textResult] = await Promise.allSettled([
      (async () => {
        try {
          const embedding = await generateTextEmbedding(text, { highPriority: true })
          console.log(`Generated text embedding: ${embedding.length} dimensions`)
          return await Image.searchByEmbedding(embedding, {
            efSearch,
            includeHidden,
            limit: candidateK,
            minSimilarity
          })
        } catch {
          return []
        }
      })(),
      Image.searchByText(text, { includeHidden, limit: candidateK })
    ])

    embeddingResults = embeddingResult.status === "fulfilled" ? embeddingResult.value : []
    textResults = textResult.status === "fulfilled" ? textResult.value : []

    console.log(`Embedding results: ${embeddingResults.length} images`)
    console.log(`Text search results: ${textResults.length} images`)
  } else {
    console.log("AI service unavailable - using caption-only search")
    textResults = await Image.searchByText(text, { includeHidden, limit: candidateK })
    console.log(`Text search results: ${textResults.length} images`)
  }

  const isTextOnlyMode = embeddingResults.length === 0 && textResults.length > 0

  const rankMapEmbed = new Map()
  embeddingResults.forEach((r, i) => rankMapEmbed.set(r.id, i + 1))
  const rankMapText = new Map()
  textResults.forEach((r, i) => rankMapText.set(r.id, i + 1))

  const embedScores = embeddingResults.map((r) => r.similarity ?? 0)
  const minE = Math.min(...embedScores, 0)
  const maxE = Math.max(...embedScores, 1e-9)

  if (embedScores.length > 0) {
    console.log(`Embedding similarity range: ${minE.toFixed(4)} - ${maxE.toFixed(4)}`)
  }

  const normEmbed = new Map()
  embeddingResults.forEach((r) => {
    const n = maxE > minE ? (r.similarity - minE) / (maxE - minE) : 0
    normEmbed.set(r.id, n)
  })

  const textScores = textResults.map((r) => r.score ?? 0)
  const minT = Math.min(...textScores, 0)
  const maxT = Math.max(...textScores, 1e-9)

  if (textScores.length > 0) {
    console.log(`Text search score range: ${minT.toFixed(4)} - ${maxT.toFixed(4)}`)
  }

  const normText = new Map()
  textResults.forEach((r) => {
    const n = maxT > minT ? (r.score - minT) / (maxT - minT) : 0
    normText.set(r.id, n)
  })

  const allIds = new Set([...rankMapEmbed.keys(), ...rankMapText.keys()])
  console.log(`Total unique images from both sources: ${allIds.size}`)

  const fused = []
  for (const id of allIds) {
    const r1 = rankMapEmbed.get(id)
    const r2 = rankMapText.get(id)
    const embedNorm = normEmbed.get(id) ?? 0
    const textNorm = normText.get(id) ?? 0

    const embedImg = embeddingResults.find((img) => img.id === id)
    const rawSimilarity = embedImg?.similarity ?? 0

    let finalScore
    let textBoost = 0

    if (isTextOnlyMode) {
      const textImg = textResults.find((img) => img.id === id)
      finalScore = textImg?.score ?? 0
    } else {
      textBoost = r2 && textNorm > 0.5 ? 0.05 : 0
      finalScore = rawSimilarity + textBoost
    }

    const RRF_K = 60
    const rrf = (r1 ? 1 / (RRF_K + r1) : 0) + (r2 ? 1 / (RRF_K + r2) : 0)

    fused.push({
      finalScore,
      id,
      rrf,
      scoreBreakdown: {
        embeddingNorm: embedNorm,
        embeddingRank: r1 ?? null,
        rawSimilarity,
        rrf,
        textBoost,
        textNorm: textNorm,
        textRank: r2 ?? null
      },
      source: r1 && r2 ? "hybrid" : r1 ? "embedding" : "text"
    })
  }

  const sourceBreakdown = {
    embedding: fused.filter((f) => f.source === "embedding").length,
    hybrid: fused.filter((f) => f.source === "hybrid").length,
    text: fused.filter((f) => f.source === "text").length
  }
  console.log(
    `Source breakdown - embedding: ${sourceBreakdown.embedding}, text: ${sourceBreakdown.text}, hybrid: ${sourceBreakdown.hybrid}`
  )

  fused.sort((a, b) => b.finalScore - a.finalScore)

  if (useDynamicThreshold && !isTextOnlyMode) {
    const scoreVals = fused.map((f) => f.finalScore)
    const mean = scoreVals.reduce((a, b) => a + b, 0) / Math.max(scoreVals.length, 1)
    const stdev = Math.sqrt(
      scoreVals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(scoreVals.length, 1)
    )
    const floor = Math.max(mean - 1.0 * stdev, minSimilarity)
    console.log(
      `Score statistics - mean: ${mean.toFixed(4)}, stdev: ${stdev.toFixed(
        4
      )}, threshold: ${floor.toFixed(4)}`
    )

    const beforeFilter = fused.length
    const filtered = fused.filter((f) => f.finalScore >= floor)
    fused.length = 0
    fused.push(...filtered)

    console.log(`Dynamic threshold filtering: ${beforeFilter} → ${fused.length} results`)
  } else if (isTextOnlyMode) {
    console.log(`Text-only mode - skipping dynamic threshold, keeping all ${fused.length} results`)
  }

  const hydrated = []
  const byIdEmbed = new Map(embeddingResults.map((r) => [r.id, r]))
  const byIdText = new Map(textResults.map((r) => [r.id, r]))

  console.log("Top 10 ranked results:")
  fused.slice(0, 10).forEach((f, i) => {
    const img = byIdEmbed.get(f.id) || byIdText.get(f.id)
    const caption = img?.captions?.en?.substring(0, 50) || "No caption"
    console.log(
      `  ${i + 1}. score=${f.finalScore.toFixed(
        4
      )} (similarity=${f.scoreBreakdown.rawSimilarity.toFixed(
        4
      )} + boost=${f.scoreBreakdown.textBoost.toFixed(2)}), source=${
        f.source
      }, caption="${caption}..."`
    )
  })

  for (const f of fused.slice(0, limit)) {
    hydrated.push(byIdEmbed.get(f.id) || byIdText.get(f.id))
  }

  const byIdBreakdown = new Map(fused.map((f) => [f.id, f.scoreBreakdown]))
  const finalResults = hydrated.map((r) => ({ ...r, scoreBreakdown: byIdBreakdown.get(r.id) }))

  console.log(`Returning ${finalResults.length} final results`)

  return finalResults
}
