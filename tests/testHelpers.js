import { getDb } from './testDb.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { UserTables, ImagesTable, EmailVerificationTokensTable } from '../api/drizzle/schema.js'

export async function createUser(userData = {}) {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  const defaultUser = {
    email: `test-${timestamp}-${random}@example.com`,
    password: 'password123',
    username: `testuser-${timestamp}-${random}`,
    admin: false,
    emailVerified: true
  }

  const user = { ...defaultUser, ...userData }
  const plainPassword = user.password

  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12)
  }

  const db = getDb()
  const result = await db.insert(UserTables).values(user).returning()
  const createdUser = result[0] || null

  if (createdUser) {
    createdUser.plainPassword = plainPassword
  }

  return createdUser
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

export async function createVerificationToken(userId, email = null) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const db = getDb()
  const result = await db
    .insert(EmailVerificationTokensTable)
    .values({
      userId,
      email: email || `test-${userId}@example.com`,
      token,
      expiresAt,
      used: false
    })
    .returning()

  return result[0]?.token || token
}
