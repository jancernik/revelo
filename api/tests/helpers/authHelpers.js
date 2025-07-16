import bcrypt from "bcryptjs"
import crypto from "crypto"

import { EmailVerificationTokensTable, UserTables } from "../../src/database/schema.js"
import { generateAccess } from "../../src/utils/tokenUtils.js"
import { getDb } from "../testDatabase.js"

const baseUserData = (data = {}) => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const uniqueSuffix = `${timestamp}-${random}`
  return {
    admin: false,
    email: `user-${uniqueSuffix}@example.com`,
    emailVerified: true,
    password: "Password123",
    username: `user-${uniqueSuffix}`,
    ...data
  }
}

export function createAccessToken(user) {
  const { admin, email, id } = user
  return generateAccess({ admin, email, id })
}

export async function createAdminUser(data) {
  return createUser({ admin: true, ...data })
}

export async function createRegularUser(data) {
  return createUser({ admin: false, ...data })
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

export async function createVerificationToken(userId, email = null) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const db = getDb()
  const result = await db
    .insert(EmailVerificationTokensTable)
    .values({
      email: email || `test-${userId}@example.com`,
      expiresAt,
      token,
      used: false,
      userId
    })
    .returning()

  return result[0]?.token || token
}
