import { indexerConfig, searchConfig } from "#src/config/search.js"
import { withAdvisoryLock } from "#src/database.js"
import Image from "#src/models/Image.js"
import { aiService, isUnavailableError } from "#src/services/aiService.js"
import * as descriptionService from "#src/services/descriptionService.js"
import storageManager from "#src/storage/storageManager.js"

export const INDEX_LOCK = "revelo:indexer"

const readThumbnail = async (image) => {
  const thumbnail = image.versions?.find((version) => version.type === "thumbnail")
  if (!thumbnail) throw new Error("Thumbnail version not found")

  const adapter = storageManager.getAdapterForStorageType(thumbnail.storageType)
  return await adapter.readFile(thumbnail.path)
}

const processImages = async (images, label, task) => {
  const result = { errors: 0, scanned: images.length, stopped: false, successful: 0 }

  for (const image of images) {
    try {
      await task(image)
      result.successful++
    } catch (error) {
      result.errors++
      console.error(`Indexing ${label} failed for image ${image.id}: ${error.message}`)
      if (isUnavailableError(error)) {
        result.stopped = true
        break
      }
    }
  }

  return result
}

const summary = (...results) => ({
  errors: results.reduce((sum, result) => sum + result.errors, 0),
  scanned: results.reduce((sum, result) => sum + result.scanned, 0),
  successful: results.reduce((sum, result) => sum + result.successful, 0)
})

const embedPending = async ({ force = false } = {}) => {
  const images = await Image.findPendingSearchEmbedding(searchConfig.model, { force })

  const result = await processImages(images, "search embedding", async (image) => {
    const { embedding, model } = await aiService.embedImage(await readThumbnail(image))
    if (model !== searchConfig.model) {
      throw new Error(`Expected model ${searchConfig.model}, AI service uses ${model}`)
    }
    await Image.setSearchEmbedding(image.id, embedding, model)
  })

  return summary(result)
}

const describePending = async ({ force = false } = {}) => {
  const images = await descriptionService.findImagesToDescribe({ force })
  const described = await processImages(images, "description", async (image) => {
    await descriptionService.saveGenerated(
      image.id,
      await aiService.describeImage(await readThumbnail(image))
    )
  })
  if (described.stopped) return summary(described)

  const missing = await descriptionService.findMissingTranslations()
  const translated = await processImages(
    missing.map((row) => ({ ...row, id: row.imageId })),
    "translation",
    async ({ imageId, language, text }) => {
      const translation = await aiService.translate(text, language)
      await descriptionService.saveTranslated(imageId, language, {
        ...translation,
        sourceText: text
      })
    }
  )

  return summary(described, translated)
}

const locked = async (task) => (await withAdvisoryLock(INDEX_LOCK, task, { wait: true })).value

export const indexSearchEmbeddings = (options) => locked(() => embedPending(options))

export const indexDescriptions = (options) => locked(() => describePending(options))

const pendingWork = async () => ({
  descriptions: await descriptionService.hasPendingDescriptions(),
  search: await Image.hasPendingSearchEmbedding(searchConfig.model)
})

const runPass = async () => {
  const before = await pendingWork()
  if (!before.search && !before.descriptions) return

  await withAdvisoryLock(INDEX_LOCK, async () => {
    if (!(await aiService.isSearchReady())) return

    const pending = await pendingWork()
    if (pending.search) await embedPending()
    if (pending.descriptions) await describePending()
  })
}

let running = null
let requested = false

export const requestPass = () => {
  if (running) {
    requested = true
    return
  }

  running = (async () => {
    do {
      requested = false
      try {
        await runPass()
      } catch (error) {
        console.error(`Indexing pass failed: ${error.message}`)
      }
    } while (requested)
    running = null
  })()
}

export const idle = async () => {
  while (running) await running
}

export const startIndexer = () => {
  requestPass()
  setInterval(requestPass, indexerConfig.intervalMs).unref()
}
