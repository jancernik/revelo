import { NotFoundError } from "#src/core/errors.js"
import { ImagesTable } from "#src/database/schema.js"
import Collection from "#src/models/Collection.js"
import Image from "#src/models/Image.js"
import { appendEntriesToArchive, getImageFileEntry } from "#src/services/imageService.js"
import archiver from "archiver"
import { eq, inArray } from "drizzle-orm"

export const createCollection = async (data) => {
  const collectionData = {
    description: data.description || null,
    title: data.title || null
  }

  const collection = await Collection.create(collectionData)
  return collection
}

export const updateCollection = async (id, data) => {
  const collection = await Collection.findById(id)

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  const updateData = {}

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description

  const result = await Collection.db
    .update(Collection.table)
    .set(updateData)
    .where(eq(Collection.table.id, id))
    .returning()

  if (!result.length) {
    throw new NotFoundError("Failed to update collection")
  }

  return result[0]
}

export const deleteCollection = async (id) => {
  const collection = await Collection.findById(id)

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  return await Collection.db.transaction(async (tx) => {
    await tx
      .update(ImagesTable)
      .set({
        collectionId: null,
        collectionOrder: null
      })
      .where(eq(ImagesTable.collectionId, id))

    await tx.delete(Collection.table).where(eq(Collection.table.id, id))
    return true
  })
}

export const bulkDeleteCollections = async (ids) => {
  return await Collection.db.transaction(async (tx) => {
    await tx
      .update(ImagesTable)
      .set({ collectionId: null, collectionOrder: null })
      .where(inArray(ImagesTable.collectionId, ids))

    await tx.delete(Collection.table).where(inArray(Collection.table.id, ids))
    return true
  })
}

export const fetchAllCollections = async (options = {}) => {
  const { includeHidden = false, ...rest } = options
  const imageWhere = includeHidden ? undefined : eq(ImagesTable.hidden, false)
  return await Collection.findAllWithImages({ ...rest, imageWhere })
}

export const fetchCollectionById = async (id, options = {}) => {
  const { includeHidden = false } = options
  const imageWhere = includeHidden ? undefined : eq(ImagesTable.hidden, false)
  const collection = await Collection.findByIdWithImages(id, { imageWhere })

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  return collection
}

export const downloadCollection = async (id) => {
  const collection = await Collection.findByIdWithImages(id)
  if (!collection) throw new NotFoundError("Collection not found")

  const imageIds = (collection.images || []).map((img) => img.id)
  const images = imageIds.length
    ? await Image.findAllWithVersionsRaw({
        columns: { originalFilename: true },
        where: inArray(Image.table.id, imageIds)
      })
    : []

  const orderMap = new Map(collection.images.map((img) => [img.id, img.collectionOrder ?? 0]))
  images.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

  const archive = archiver("zip", { zlib: { level: 6 } })
  appendEntriesToArchive(archive, await Promise.all(images.map(getImageFileEntry)))

  return { archive, filename: `${collection.title || "collection"}` }
}

export const downloadCollections = async (ids) => {
  const collections = await Collection.findAllWithImages({
    where: inArray(Collection.table.id, ids)
  })
  const archive = archiver("zip", { zlib: { level: 6 } })
  const usedFolders = new Set()

  for (const collection of collections) {
    const imageIds = (collection.images || []).map((img) => img.id)
    if (!imageIds.length) continue

    const images = await Image.findAllWithVersionsRaw({
      columns: { originalFilename: true },
      where: inArray(Image.table.id, imageIds)
    })
    const orderMap = new Map(collection.images.map((img) => [img.id, img.collectionOrder ?? 0]))
    images.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

    const baseFolder = collection.title || "Untitled"
    let folder = baseFolder
    if (usedFolders.has(folder)) {
      let counter = 1
      while (usedFolders.has(`${baseFolder} (${counter})`)) counter++
      folder = `${baseFolder} (${counter})`
    }
    usedFolders.add(folder)

    appendEntriesToArchive(archive, await Promise.all(images.map(getImageFileEntry)), folder)
  }

  return archive
}

export const setCollectionImages = async (collectionId, imageIds) => {
  const collection = await Collection.findById(collectionId)

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  return await Collection.setCollectionImages(collectionId, imageIds)
}
