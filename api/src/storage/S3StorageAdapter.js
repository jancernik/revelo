import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3"

class S3StorageAdapter {
  constructor(config) {
    this.bucket = config.bucket
    this.region = config.region || "auto"
    this.publicUrl = config.publicUrl

    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint,
      region: this.region
    })
  }

  async deleteDirectory(dirPath) {
    try {
      const prefix = this.#getS3Key(dirPath) + "/"
      const listedObjects = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix
        })
      )

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log(`No objects found in S3 with prefix: ${prefix}`)
        return
      }

      console.log(
        `Deleting ${listedObjects.Contents.length} objects from S3 with prefix: ${prefix}`
      )

      await Promise.all(
        listedObjects.Contents.map((object) =>
          this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: object.Key
            })
          )
        )
      )

      console.log(`Successfully deleted ${listedObjects.Contents.length} objects from S3`)
    } catch (error) {
      console.log(`Error deleting directory from S3: ${error.message}`)
      throw error
    }
  }

  async ensureDirectories() {}

  getPublicUrl(filePath) {
    const key = this.#getS3Key(filePath)
    return this.publicUrl ? `${this.publicUrl}/${key}` : ""
  }

  getReadablePath() {
    return null
  }

  isLocal() {
    return false
  }

  async readFile(filePath) {
    const key = this.#getS3Key(filePath)
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    )

    const chunks = []
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async writeFile(filePath, data, options = {}) {
    const key = this.#getS3Key(filePath)
    const contentType = options.contentType || this.#getContentType(filePath)

    await this.client.send(
      new PutObjectCommand({
        Body: data,
        Bucket: this.bucket,
        ContentDisposition: "inline",
        ContentType: contentType,
        Key: key
      })
    )
  }

  #getContentType(filePath) {
    const ext = filePath.split(".").pop().toLowerCase()
    const mimeTypes = {
      avif: "image/avif",
      gif: "image/gif",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      svg: "image/svg+xml",
      webp: "image/webp"
    }
    return mimeTypes[ext] || "application/octet-stream"
  }

  #getS3Key(filePath) {
    return filePath.replace(/^\/+/, "").replace(/\\/g, "/")
  }
}

export default S3StorageAdapter
