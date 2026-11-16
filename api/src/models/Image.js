import { and, cosineDistance, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"

import { config } from "#src/config/environment.js"
import { ImagesTable, ImageVersionsTable } from "#src/database/schema.js"
import BaseModel from "#src/models/BaseModel.js"
import { QUERY_API_DESCRIPTION_COLUMNS, withDescriptionMap } from "#src/models/descriptions.js"
import storageManager from "#src/storage/storageManager.js"

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

class Image extends BaseModel {
  static QUERY_API_IMAGE_COLUMNS = {
    aperture: true,
    camera: true,
    captions: true,
    collectionId: true,
    collectionOrder: true,
    comment: true,
    date: true,
    focalLength: true,
    focalLengthEquivalent: true,
    hidden: true,
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
    super(ImagesTable)
  }

  async createWithVersions(file, data) {
    return await this.db.transaction(async (tx) => {
      const result = await tx.insert(this.table).values(data).returning()
      const image = result[0]

      const imageDir = storageManager.getImageDirectory(image.id)

      if (storageManager.isLocalStorage()) {
        await fs.mkdir(imageDir, { recursive: true })
      }

      const versions = await this.#createImageVersions(tx, file, image.id, imageDir)

      return {
        ...image,
        versions
      }
    })
  }

  async findAllByVersion(version, options = {}) {
    const { columns, imageWhere, limit, orderBy } = options

    const results = await this.db.query.ImageVersionsTable.findMany({
      columns: columns || undefined,
      limit: limit || undefined,
      orderBy: orderBy || undefined,
      where: eq(ImageVersionsTable.type, version),
      with: imageWhere ? { image: { columns: { id: true }, where: imageWhere } } : undefined
    })

    const filtered = imageWhere ? results.filter((v) => v.image !== null) : results

    return filtered.map((v) => {
      // eslint-disable-next-line no-unused-vars
      const { image: _image, ...rest } = v
      if (rest.path !== undefined) {
        return { ...rest, path: this.#getPublicUrlForVersion(rest) }
      }
      return rest
    })
  }

  async findAllWithVersions(options = {}) {
    const { limit, offset, orderBy, where } = options

    const queryOptions = {
      columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
      orderBy: orderBy || undefined,
      where: where || undefined,
      with: {
        descriptions: { columns: QUERY_API_DESCRIPTION_COLUMNS },
        versions: {
          columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
        }
      }
    }

    if (limit !== undefined) queryOptions.limit = limit
    if (offset !== undefined) queryOptions.offset = offset

    const results = await this.db.query.ImagesTable.findMany(queryOptions)
    const transformed = results.map((img) => this.#transformImageWithUrls(img))

    return transformed.filter((img) => this.#hasAccessibleVersions(img))
  }

  async findAllWithVersionsRaw(options = {}) {
    const { columns, limit, offset, orderBy, where } = options

    const queryOptions = {
      columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS, ...columns },
      orderBy: orderBy || undefined,
      where: where || undefined,
      with: {
        versions: {
          columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
        }
      }
    }

    if (limit !== undefined) queryOptions.limit = limit
    if (offset !== undefined) queryOptions.offset = offset

    return await this.db.query.ImagesTable.findMany(queryOptions)
  }

  async findByIdsWithVersions(ids) {
    if (ids.length === 0) return []

    const images = await this.findAllWithVersions({ where: inArray(this.table.id, ids) })
    const byId = new Map(images.map((image) => [image.id, image]))

    return ids.map((id) => byId.get(id)).filter(Boolean)
  }

  async findByIdWithVersions(id) {
    try {
      const result = await this.db.query.ImagesTable.findFirst({
        columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
        where: eq(this.table.id, id),
        with: {
          descriptions: { columns: QUERY_API_DESCRIPTION_COLUMNS },
          versions: {
            columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
          }
        }
      })

      if (!result) return null

      const transformed = this.#transformImageWithUrls(result)
      return this.#hasAccessibleVersions(transformed) ? transformed : null
    } catch {
      return null
    }
  }

  async findByIdWithVersionsRaw(id, options = {}) {
    const { columns } = options
    try {
      return await this.db.query.ImagesTable.findFirst({
        columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS, ...columns },
        where: eq(this.table.id, id),
        with: {
          versions: {
            columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS }
          }
        }
      })
    } catch {
      return null
    }
  }

  async findIdsByMetadata(text, options = {}) {
    const { includeHidden = false } = options
    const pattern = `(?<![[:alnum:]])${escapeRegex(text)}(?![[:alnum:]])`
    const matches = or(
      sql`${this.table.camera} ~* ${pattern}`,
      sql`${this.table.lens} ~* ${pattern}`,
      sql`${this.table.comment} ~* ${pattern}`
    )

    const results = await this.db
      .select({ id: this.table.id })
      .from(this.table)
      .where(includeHidden ? matches : and(matches, eq(this.table.hidden, false)))
      .orderBy(desc(this.table.createdAt))

    return results.map((row) => row.id)
  }

  async findPendingSearchEmbedding(model, options = {}) {
    const { force = false } = options

    return await this.findAllWithVersionsRaw({
      where: force ? undefined : this.#searchEmbeddingPending(model)
    })
  }

  async hasPendingSearchEmbedding(model) {
    const results = await this.db
      .select({ id: this.table.id })
      .from(this.table)
      .where(this.#searchEmbeddingPending(model))
      .limit(1)

    return results.length > 0
  }

  async scoreBySimilarity(embedding, options = {}) {
    const { includeHidden = false, model } = options
    const similarity = sql`1 - (${cosineDistance(this.table.searchEmbedding, embedding)})`
    const embedded = eq(this.table.searchEmbeddingModel, model)

    return await this.db
      .select({ id: this.table.id, similarity: similarity.mapWith(Number) })
      .from(this.table)
      .where(includeHidden ? embedded : and(embedded, eq(this.table.hidden, false)))
      .orderBy(desc(similarity))
  }

  async setSearchEmbedding(id, embedding, model) {
    await this.db
      .update(this.table)
      .set({ searchEmbedding: embedding, searchEmbeddingModel: model })
      .where(eq(this.table.id, id))
  }

  transformImageWithUrls(image) {
    return this.#transformImageWithUrls(image)
  }

  async #createImageVersions(tx, file, imageId, imageDir) {
    const versions = []
    const originalFilePath = file.path
    const originalFilename = `original.${file.originalname.split(".").pop()}`
    const tempOutputPath = path.join(storageManager.stagingDir, `${imageId}-${originalFilename}`)

    await sharp(originalFilePath).rotate().toFile(tempOutputPath)

    const metadata = await sharp(tempOutputPath).metadata()
    const isVertical = metadata.height > metadata.width

    const sizes = {
      original: { height: metadata.height, width: metadata.width },
      regular: {
        height: isVertical ? Math.round(2000 * (metadata.height / metadata.width)) : 2000,
        width: isVertical ? 2000 : Math.round(2000 * (metadata.width / metadata.height))
      },
      thumbnail: {
        height: isVertical ? Math.round(800 * (metadata.height / metadata.width)) : 800,
        width: isVertical ? 800 : Math.round(800 * (metadata.width / metadata.height))
      },
      tiny: {
        height: isVertical ? Math.round(150 * (metadata.height / metadata.width)) : 150,
        width: isVertical ? 150 : Math.round(150 * (metadata.width / metadata.height))
      }
    }

    for (const [type, size] of Object.entries(sizes)) {
      const filename = `${type}.${file.originalname.split(".").pop()}`
      const tempProcessedPath = path.join(
        storageManager.stagingDir,
        `${imageId}-${type}-${filename}`
      )
      const finalPath = path.join(imageDir, filename)

      if (type === "original") {
        await fs.copyFile(tempOutputPath, tempProcessedPath)
      } else {
        await sharp(tempOutputPath)
          .resize({
            fit: "inside",
            height: size.height,
            width: size.width,
            withoutEnlargement: true
          })
          .toFile(tempProcessedPath)
      }

      const fileData = await fs.readFile(tempProcessedPath)
      await storageManager.adapter.writeFile(finalPath, fileData)

      const stats = await fs.stat(tempProcessedPath)
      const outputMeta = await sharp(tempProcessedPath).metadata()

      const versionData = {
        height: outputMeta.height,
        imageId,
        mimetype: file.mimetype,
        path: finalPath,
        size: stats.size,
        storageType: storageManager.isLocalStorage() ? "local" : "s3",
        type,
        width: outputMeta.width
      }

      const versionResult = await tx.insert(ImageVersionsTable).values(versionData).returning()
      versions.push(versionResult[0])

      await fs.unlink(tempProcessedPath)
    }

    await fs.unlink(originalFilePath)
    await fs.unlink(tempOutputPath)

    return versions
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

  #searchEmbeddingPending(model) {
    return or(isNull(this.table.searchEmbeddingModel), ne(this.table.searchEmbeddingModel, model))
  }

  #shouldExcludeS3Images() {
    return !config.BUCKET_PUBLIC_URL
  }

  #transformImageWithUrls(image) {
    if (!image) return image

    const filteredImage = this.#filterAccessibleVersions(image)

    const transformedImage = withDescriptionMap(filteredImage)

    if (transformedImage.versions && Array.isArray(transformedImage.versions)) {
      transformedImage.versions = transformedImage.versions.map((version) => ({
        ...version,
        path: this.#getPublicUrlForVersion(version)
      }))
    }

    return transformedImage
  }
}

export default new Image()
