import { getDb } from './testDb.js'
import bcrypt from 'bcryptjs'
import { UserTables, ImagesTable } from '../api/drizzle/schema.js'

export async function createUser(userData = {}) {
  const timestamp = Date.now()
  const defaultUser = {
    email: `test-${timestamp}@example.com`,
    password: 'password123',
    username: `testuser-${timestamp}`,
    admin: false,
    emailVerified: true
  }

  const user = { ...defaultUser, ...userData }

  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12)
  }

  const db = getDb()
  const result = await db.insert(UserTables).values(user).returning()
  return result[0] || null
}

export async function createImage(imageData = {}) {
  const defaultImage = {
    originalFilename: 'test-image.jpg',
    camera: 'Test Camera',
    lens: 'Test Lens',
    aperture: 'f/2.8',
    shutterSpeed: '1/125',
    iso: 200,
    focalLength: '50mm',
    date: new Date()
  }

  const image = { ...defaultImage, ...imageData }

  const db = getDb()
  const result = await db.insert(ImagesTable).values(image).returning()
  return result[0] || null
}

export async function createImages(count = 5) {
  const images = []
  for (let i = 0; i < count; i++) {
    const image = await createImage({ originalFilename: `image-${i}.jpg` })
    images.push(image)
  }
  return images
}
