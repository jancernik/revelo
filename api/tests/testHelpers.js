import { getDb } from "./testDb.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { UserTables, ImagesTable, EmailVerificationTokensTable } from "../drizzle/schema.js"
import { generateAccess } from "../utils/tokenUtils.js"

const baseUserData = (data = {}) => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const uniqueSuffix = `${timestamp}-${random}`
  return {
    email: `user-${uniqueSuffix}@example.com`,
    password: "Password123",
    username: `user-${uniqueSuffix}`,
    admin: false,
    emailVerified: true,
    ...data
  }
}

export async function createUser(data) {
  const userData = baseUserData(data)
  const plainPassword = userData.password

  userData.password = await bcrypt.hash(plainPassword, 10)

  const db = getDb()
  const result = await db.insert(UserTables).values(userData).returning()
  const createdUser = result[0] || null

  if (createdUser) createdUser.plainPassword = plainPassword

  return createdUser
}

export async function createAdminUser(data) {
  return createUser({ admin: true, ...data })
}

export async function createRegularUser(data) {
  return createUser({ admin: false, ...data })
}

export async function createImage(imageData = {}) {
  const defaultImage = {
    originalFilename: "test-image.jpg",
    camera: "Test Camera",
    lens: "Test Lens",
    aperture: "f/2.8",
    shutterSpeed: "1/125",
    iso: 200,
    focalLength: "50mm",
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
  const token = crypto.randomBytes(32).toString("hex")
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

export function createAccessToken(user) {
  const { admin, email, id } = user
  return generateAccess({ admin, email, id })
}
