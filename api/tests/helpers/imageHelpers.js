import { ImagesTable } from "#src/database/schema.js"
import { getDb } from "#tests/testDatabase.js"

const baseImageData = (data = {}) => {
  return {
    aperture: "f/2.8",
    camera: "Test Camera",
    date: new Date(),
    focalLength: "50mm",
    iso: 200,
    lens: "Test Lens",
    originalFilename: "test-image.jpg",
    shutterSpeed: "1/250",
    ...data
  }
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
    const imageData = baseImageData({ originalFilename: `test-image-${i}.jpg`, ...data[i] })
    imagesData.push(imageData)
  }

  const db = getDb()
  const result = await db.insert(ImagesTable).values(imagesData).returning()
  return result || []
}
