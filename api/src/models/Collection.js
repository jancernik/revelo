import { CollectionsTable, ImagesTable } from "#src/database/schema.js"
import BaseModel from "#src/models/BaseModel.js"
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
    date: true,
    focalLength: true,
    id: true,
    iso: true,
    lens: true,
    shutterSpeed: true
  }

  static QUERY_API_VERSION_COLUMNS = {
    height: true,
    path: true,
    size: true,
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

    return await this.db.query.CollectionsTable.findMany(queryOptions)
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
      return result || null
    } catch {
      return null
    }
  }

  async setCollectionImages(collectionId, imageIds) {
    return await this.db.transaction(async (tx) => {
      const currentImages = await tx
        .select({ id: ImagesTable.id })
        .from(ImagesTable)
        .where(eq(ImagesTable.collectionId, collectionId))

      const currentImageIds = currentImages.map((img) => img.id)
      const removedImageIds = currentImageIds.filter((id) => !imageIds.includes(id))

      if (removedImageIds.length > 0) {
        await tx
          .update(ImagesTable)
          .set({
            collectionId: null,
            collectionOrder: null
          })
          .where(inArray(ImagesTable.id, removedImageIds))
      }

      if (imageIds.length > 0) {
        await tx
          .update(ImagesTable)
          .set({
            collectionOrder: null
          })
          .where(and(eq(ImagesTable.collectionId, collectionId), inArray(ImagesTable.id, imageIds)))

        for (let index = 0; index < imageIds.length; index++) {
          await tx
            .update(ImagesTable)
            .set({
              collectionId,
              collectionOrder: index
            })
            .where(eq(ImagesTable.id, imageIds[index]))
        }
      }
      return await this.findByIdWithImages(collectionId)
    })
  }
}

export default new Collection()
