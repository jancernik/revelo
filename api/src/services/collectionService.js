import { NotFoundError } from "#src/core/errors.js"
import { ImagesTable } from "#src/database/schema.js"
import Collection from "#src/models/Collection.js"
import { eq } from "drizzle-orm"

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

export const fetchAllCollections = async (options = {}) => {
  return await Collection.findAllWithImages(options)
}

export const fetchCollectionById = async (id) => {
  const collection = await Collection.findByIdWithImages(id)

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  return collection
}

export const setCollectionImages = async (collectionId, imageIds) => {
  const collection = await Collection.findById(collectionId)

  if (!collection) {
    throw new NotFoundError("Collection not found")
  }

  return await Collection.setCollectionImages(collectionId, imageIds)
}
