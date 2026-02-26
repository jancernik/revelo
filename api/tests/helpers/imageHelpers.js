import { ImagesTable, ImageVersionsTable } from "#src/database/schema.js"
import storageManager from "#src/storage/storageManager.js"
import { getDb } from "#tests/testDatabase.js"
import fs from "fs/promises"
import path from "path"

const baseImageData = (data = {}) => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const uniqueSuffix = `${timestamp}-${random}`

  return {
    aperture: "f/2.8",
    camera: "Test Camera",
    captions: { en: "Test Caption EN", es: "Test Caption ES" },
    comment: `Test Comment ${uniqueSuffix}`,
    date: new Date("2023-01-01"),
    focalLength: "50mm",
    focalLengthEquivalent: "75mm",
    iso: 200,
    lens: "Test Lens",
    originalFilename: `test-image-${uniqueSuffix}.jpg`,
    shutterSpeed: "1/250",
    ...data
  }
}

const createMockImageBuffer = () => {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64"
  )
}

export async function cleanupTempFiles() {
  await storageManager.cleanupTestFiles()
}

export async function createImage(data) {
  const imageData = baseImageData(data)

  const db = getDb()
  const result = await db.insert(ImagesTable).values(imageData).returning()
  const createdImage = result[0] || null

  return createdImage
}

export async function createImages(count = 5, data = []) {
  const imagesData = []

  for (let i = 0; i < count; i++) {
    const imageData = baseImageData({
      camera: `Test Camera ${i}`,
      originalFilename: `test-image-${i}.jpg`,
      ...data[i]
    })
    imagesData.push(imageData)
  }

  const db = getDb()
  const result = await db.insert(ImagesTable).values(imagesData).returning()
  return result || []
}

export async function createImageVersion(imageId, type = "original", data = {}) {
  const versionData = {
    height: 100,
    imageId,
    mimetype: "image/jpeg",
    path: `/uploads/${imageId}/${type}.jpg`,
    size: 1000,
    type,
    width: 100,
    ...data
  }

  const db = getDb()
  const result = await db.insert(ImageVersionsTable).values(versionData).returning()
  return result[0] || null
}

export async function createImageWithFile(data = {}) {
  const image = await createImage(data)
  const types = ["original", "regular", "thumbnail", "tiny"]
  const versions = []

  for (const type of types) {
    const imagePath = storageManager.getImagePath(image.id, `${type}.jpg`)
    await storageManager.adapter.writeFile(imagePath, createMockImageBuffer())
    const version = await createImageVersion(image.id, type, { path: imagePath })
    versions.push(version)
  }

  return { ...image, versions }
}

export async function createImageWithVersions(imageData = {}) {
  const image = await createImage(imageData)

  const versions = await Promise.all([
    createImageVersion(image.id, "original"),
    createImageVersion(image.id, "regular"),
    createImageVersion(image.id, "thumbnail"),
    createImageVersion(image.id, "tiny")
  ])

  return {
    ...image,
    versions
  }
}

export function createMockFile(filename = "test-image.jpg") {
  const mockImageBuffer = createMockImageBuffer()
  const tempDir = path.dirname(storageManager.stagingDir)
  const tempFilePath = path.join(tempDir, filename)

  return {
    buffer: mockImageBuffer,
    mimetype: "image/png",
    originalname: filename,
    path: tempFilePath,
    size: mockImageBuffer.length
  }
}

export async function createTempFile(file) {
  const tempDir = path.dirname(file.path)
  await fs.mkdir(tempDir, { recursive: true })
  await fs.writeFile(file.path, file.buffer)
  return file.path
}

export function getMetadataTestData() {
  return {
    canonR5: {
      exif: {
        DateTimeOriginal: new Date("2023-01-01T12:00:00Z"),
        ExposureTime: 1 / 250,
        FNumber: 2.8,
        FocalLength: 50,
        FocalLengthIn35mmFormat: 80,
        ISO: 200,
        LensModel: "RF 24-70mm f/2.8L IS USM",
        Make: "Canon",
        Model: "EOS R5"
      },
      expected: {
        aperture: "2.8",
        camera: "Canon EOS R5",
        date: "2023-01-01",
        focalLength: "50",
        focalLengthEquivalent: "80",
        iso: "200",
        lens: "RF 24-70mm f/2.8L IS USM",
        shutterSpeed: "1/250"
      }
    },
    nikonD850: {
      exif: {
        DateTimeOriginal: new Date("2023-06-15T14:30:45Z"),
        ExposureTime: 1 / 500,
        FNumber: 1.4,
        FocalLength: 85,
        FocalLengthIn35mmFormat: 85,
        ISO: 800,
        LensModel: "NIKKOR Z 85mm f/1.8 S",
        Make: "Nikon",
        Model: "D850"
      },
      expected: {
        aperture: "1.4",
        camera: "Nikon D850",
        date: "2023-06-15",
        focalLength: "85",
        focalLengthEquivalent: "85",
        iso: "800",
        lens: "NIKKOR Z 85mm f/1.8 S",
        shutterSpeed: "1/500"
      }
    },
    sonyA7IV: {
      exif: {
        DateTimeOriginal: new Date("2023-12-01T18:45:12Z"),
        ExposureTime: 2,
        FNumber: 4.0,
        FocalLength: 24,
        FocalLengthIn35mmFormat: 36,
        ISO: 100,
        LensModel: "FE 24-70mm F4 ZA OSS",
        Make: "Sony",
        Model: "ILCE-7M4"
      },
      expected: {
        aperture: "4",
        camera: "Sony ILCE-7M4",
        date: "2023-12-01",
        focalLength: "24",
        focalLengthEquivalent: "36",
        iso: "100",
        lens: "FE 24-70mm F4 ZA OSS",
        shutterSpeed: "2"
      }
    }
  }
}
