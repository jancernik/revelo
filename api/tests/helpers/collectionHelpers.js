import { CollectionsTable } from "#src/database/schema.js"
import { createImageWithVersions } from "#tests/helpers/imageHelpers.js"
import { getDb } from "#tests/testDatabase.js"

const baseCollectionData = (data = {}) => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const uniqueSuffix = `${timestamp}-${random}`

  return {
    description: `Test collection description ${uniqueSuffix}`,
    title: `Test Collection ${uniqueSuffix}`,
    ...data
  }
}

export async function createCollection(data = {}) {
  const collectionData = baseCollectionData(data)

  const db = getDb()
  const result = await db.insert(CollectionsTable).values(collectionData).returning()
  return result[0] || null
}

export async function createCollections(count = 3, data = []) {
  const collectionsData = []

  for (let i = 0; i < count; i++) {
    collectionsData.push(baseCollectionData({ title: `Test Collection ${i}`, ...data[i] }))
  }

  const db = getDb()
  const result = await db.insert(CollectionsTable).values(collectionsData).returning()
  return result || []
}

export async function createCollectionWithImages(count = 2, collectionData = {}) {
  const collection = await createCollection(collectionData)
  const images = []

  for (let i = 0; i < count; i++) {
    images.push(await createImageWithVersions({ collectionId: collection.id, collectionOrder: i }))
  }

  return { ...collection, images }
}
