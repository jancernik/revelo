import { config } from "#src/config/environment.js"
import { ImagesTable, ImageVersionsTable } from "#src/database/schema.js"
import BaseModel from "#src/models/BaseModel.js"
import storageManager from "#src/storage/storageManager.js"
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"

class Image extends BaseModel {
  static FLUENT_API_IMAGE_COLUMNS = {
    aperture: ImagesTable.aperture,
    camera: ImagesTable.camera,
    caption: ImagesTable.caption,
    collectionId: ImagesTable.collectionId,
    collectionOrder: ImagesTable.collectionOrder,
    date: ImagesTable.date,
    focalLength: ImagesTable.focalLength,
    focalLengthEquivalent: ImagesTable.focalLengthEquivalent,
    id: ImagesTable.id,
    iso: ImagesTable.iso,
    lens: ImagesTable.lens,
    shutterSpeed: ImagesTable.shutterSpeed
  }

  static QUERY_API_IMAGE_COLUMNS = {
    aperture: true,
    camera: true,
    caption: true,
    collectionId: true,
    collectionOrder: true,
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
    const { columns, limit, orderBy } = options

    const results = await this.db.query.ImageVersionsTable.findMany({
      columns: columns || undefined,
      limit: limit || undefined,
      orderBy: orderBy || undefined,
      where: eq(ImageVersionsTable.type, version)
    })

    return results.map((v) => {
      if (v.path !== undefined) {
        return { ...v, path: this.#getPublicUrlForVersion(v) }
      }
      return v
    })
  }

  async findAllWithVersions(options = {}) {
    const { limit, offset, orderBy, where } = options

    const queryOptions = {
      columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
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

    const results = await this.db.query.ImagesTable.findMany(queryOptions)
    const transformed = results.map((img) => this.#transformImageWithUrls(img))

    return transformed.filter((img) => this.#hasAccessibleVersions(img))
  }

  async findByIdWithVersions(id) {
    try {
      const result = await this.db.query.ImagesTable.findFirst({
        columns: { ...this.constructor.QUERY_API_IMAGE_COLUMNS },
        where: eq(this.table.id, id),
        with: {
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

  async searchByEmbedding(embedding, options = {}) {
    const { limit = 50, minSimilarity = 0.25 } = options

    const similarity = sql`1 - (${cosineDistance(this.table.embedding, embedding)})`

    const results = await this.db
      .select({ ...this.constructor.FLUENT_API_IMAGE_COLUMNS, similarity })
      .from(this.table)
      .where(gt(similarity, minSimilarity))
      .orderBy((t) => desc(t.similarity))
      .limit(limit)

    return await this.#addImageVersions(results)
  }

  async searchByText(text, options = {}) {
    const { limit = 50 } = options

    const searchVector = sql`(
      setweight(to_tsvector('english', coalesce(${this.table.caption}, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(${this.table.camera}, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(${this.table.lens}, '')), 'B')
    )`

    const searchQuery = sql`plainto_tsquery('english', ${text})`
    const rank = sql`ts_rank(${searchVector}, ${searchQuery})`

    const results = await this.db
      .select({ ...this.constructor.FLUENT_API_IMAGE_COLUMNS, score: rank.as("score") })
      .from(this.table)
      .where(sql`${searchVector} @@ ${searchQuery}`)
      .orderBy(desc(rank))
      .limit(limit)

    return await this.#addImageVersions(results)
  }

  transformImageWithUrls(image) {
    return this.#transformImageWithUrls(image)
  }

  async #addImageVersions(images = []) {
    if (images.length === 0) return []

    const ids = images.map((r) => r.id)

    const versions = await this.db.query.ImageVersionsTable.findMany({
      columns: { ...this.constructor.QUERY_API_VERSION_COLUMNS, imageId: true },
      where: sql`${ImageVersionsTable.imageId} IN (${sql.join(ids, sql`, `)})`
    })

    const transformed = images.map((i) =>
      this.#transformImageWithUrls({ ...i, versions: versions.filter((v) => v.imageId === i.id) })
    )

    return transformed.filter((img) => this.#hasAccessibleVersions(img))
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

  #shouldExcludeS3Images() {
    return !config.BUCKET_PUBLIC_URL
  }

  #transformImageWithUrls(image) {
    if (!image) return image

    const filteredImage = this.#filterAccessibleVersions(image)

    if (filteredImage.versions && Array.isArray(filteredImage.versions)) {
      filteredImage.versions = filteredImage.versions.map((version) => ({
        ...version,
        path: this.#getPublicUrlForVersion(version)
      }))
    }

    return filteredImage
  }
}

export default new Image()
