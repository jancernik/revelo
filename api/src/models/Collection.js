import { config } from "#src/config/environment.js"
import { CollectionsTable, ImagesTable } from "#src/database/schema.js"
import BaseModel from "#src/models/BaseModel.js"
import storageManager from "#src/storage/storageManager.js"
import { and, asc, eq, inArray } from "drizzle-orm"

class Collection extends BaseModel {
  static QUERY_API_COLLECTION_COLUMNS = {
    createdAt: true,
    description: true,
    id: true,
    title: true,
    updatedAt: true
  }

  static QUERY_API_IMAGE_COLUMNS = {
    aperture: true,
    camera: true,
    caption: true,
    collectionId: true,
    collectionOrder: true,
    comment: true,
    date: true,
    focalLength: true,
    focalLengthEquivalent: true,
    id: true,
    iso: true,
    lens: true,
    shutterSpeed: true
  }

  static QUERY_API_VERSION_COLUMNS = {
    height: true,
    path: true,
    size: true,
    storageType: true,
    type: true,
    width: true
  }

  constructor() {
    super(CollectionsTable)
  }

  async findAllWithImages(options = {}) {
    const { limit, offset, orderBy, where } = options

    const queryOptions = {
      columns: { ...this.constructor.QUERY_API_COLLECTION_COLUMNS },
      orderBy: orderBy || undefined,
      where: where || undefined,
      with: {
        images: {
          columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
          orderBy: asc(ImagesTable.collectionOrder),
          with: {
            versions: {
              columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
            }
          }
        }
      }
    }

    if (limit !== undefined) {
      queryOptions.limit = limit
    }

    if (offset !== undefined) {
      queryOptions.offset = offset
    }

    const results = await this.db.query.CollectionsTable.findMany(queryOptions)
    return results.map((collection) => this.#transformCollectionWithUrls(collection))
  }

  async findByIdWithImages(id) {
    try {
      const result = await this.db.query.CollectionsTable.findFirst({
        columns: { ...this.constructor.QUERY_API_COLLECTION_COLUMNS },
        where: eq(this.table.id, id),
        with: {
          images: {
            columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
            orderBy: asc(ImagesTable.collectionOrder),
            with: {
              versions: {
                columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
              }
            }
          }
        }
      })
      return result ? this.#transformCollectionWithUrls(result) : null
    } catch {
      return null
    }
  }

  async setCollectionImages(collectionId, imageIds) {
    await this.db.transaction(async (tx) => {
      const currentImages = await tx
        .select({ id: ImagesTable.id })
        .from(ImagesTable)
        .where(eq(ImagesTable.collectionId, collectionId))

      const currentImageIds = currentImages.map((img) => img.id)
      const removedImageIds = currentImageIds.filter((id) => !imageIds.includes(id))

      if (removedImageIds.length > 0) {
        await tx
          .update(ImagesTable)
          .set({ collectionId: null, collectionOrder: null })
          .where(inArray(ImagesTable.id, removedImageIds))
      }

      if (imageIds.length > 0) {
        await tx
          .update(ImagesTable)
          .set({ collectionOrder: null })
          .where(and(eq(ImagesTable.collectionId, collectionId), inArray(ImagesTable.id, imageIds)))

        for (let index = 0; index < imageIds.length; index++) {
          await tx
            .update(ImagesTable)
            .set({ collectionId, collectionOrder: index })
            .where(eq(ImagesTable.id, imageIds[index]))
        }
      }
    })
    return await this.findByIdWithImages(collectionId)
  }

  #filterAccessibleVersions(image) {
    if (!image.versions || !Array.isArray(image.versions)) return image

    const shouldExcludeS3 = this.#shouldExcludeS3Images()
    if (shouldExcludeS3) {
      return {
        ...image,
        versions: image.versions.filter((v) => v.storageType !== "s3")
      }
    }

    return image
  }

  #getPublicUrlForVersion(version) {
    const storageType = version.storageType || "local"

    if (storageType === "s3") {
      return storageManager.getPublicUrlForS3(version.path)
    }

    return `/api/${version.path}`
  }

  #hasAccessibleVersions(image) {
    if (!image.versions || !Array.isArray(image.versions) || image.versions.length === 0) {
      return false
    }

    const shouldExcludeS3 = this.#shouldExcludeS3Images()
    if (shouldExcludeS3) {
      return image.versions.some((v) => v.storageType !== "s3")
    }

    return true
  }

  #shouldExcludeS3Images() {
    return !config.BUCKET_PUBLIC_URL
  }

  #transformCollectionWithUrls(collection) {
    if (!collection) return collection

    if (collection.images && Array.isArray(collection.images)) {
      collection.images = collection.images
        .map((image) => {
          const filteredImage = this.#filterAccessibleVersions(image)

          if (filteredImage.versions && Array.isArray(filteredImage.versions)) {
            filteredImage.versions = filteredImage.versions.map((version) => ({
              ...version,
              path: this.#getPublicUrlForVersion(version)
            }))
          }
          return filteredImage
        })
        .filter((image) => this.#hasAccessibleVersions(image))
    }

    return collection
  }
}

export default new Collection()
