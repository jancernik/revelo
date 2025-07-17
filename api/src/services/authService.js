import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from "#src/core/errors.js"
import EmailVerificationToken from "#src/models/EmailVerificationToken.js"
import RevokedToken from "#src/models/RevokedToken.js"
import Setting from "#src/models/Setting.js"
import User, { userSerializer } from "#src/models/User.js"
import { sendVerificationEmail, sendWelcomeEmail } from "#src/services/emailService.js"
import { generateAccess, generateRefresh, verifyRefresh } from "#src/utils/tokenUtils.js"
import { eq } from "drizzle-orm"

export const signup = async ({ email, password, username }) => {
  const enableSignups = await Setting.get("enableSignups")
  if (!enableSignups) {
    throw new ForbiddenError("Signup is disabled.")
  }

  const emailExists = await User.findByEmail(email)
  if (emailExists) {
    throw new ValidationError("Email already used.")
  }

  const usernameExists = await User.findByUsername(username)
  if (usernameExists) {
    throw new ValidationError("Username already used.")
  }

  const adminCount = await User.count(eq(User.table.admin, true))
  const maxAdmins = await Setting.get("maxAdmins", { includeRestricted: true })
  const isAdmin = adminCount < maxAdmins?.value

  const newUser = await User.create({
    admin: isAdmin,
    email,
    password,
    username
  })

  const verificationToken = await EmailVerificationToken.createToken(newUser.id, email)

  try {
    sendVerificationEmail(email, verificationToken.token, username)
  } catch (error) {
    console.error("Failed to send verification email:", error)
  }

  return { user: newUser }
}

export const verifyEmail = async (token) => {
  const verificationToken = await EmailVerificationToken.findValidToken(token)
  if (!verificationToken) {
    throw new ValidationError("Invalid or expired verification token.")
  }

  const user = await User.findById(verificationToken.userId)
  if (!user) {
    throw new NotFoundError("User not found.")
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified.")
  }

  await User.markEmailVerified(user.id)
  await EmailVerificationToken.markTokenUsed(token)

  try {
    sendWelcomeEmail(user.email, user.username)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
  }

  const updatedUser = { ...user, emailVerified: true }
  const accessToken = generateAccess(updatedUser)
  const refreshToken = generateRefresh(updatedUser)

  return {
    accessToken,
    refreshToken,
    user: updatedUser
  }
}

export const resendVerificationEmail = async (email) => {
  const user = await User.findByEmail(email)
  if (!user) {
    throw new NotFoundError("User not found.")
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified.")
  }

  const verificationToken = await EmailVerificationToken.createToken(user.id, email)
  await sendVerificationEmail(email, verificationToken.token, user.username)
}

export const login = async ({ password, username }) => {
  const user = await User.findByUsername(username)
  if (!user) {
    throw new UnauthorizedError("Invalid credentials.")
  }

  const match = await User.verifyPassword(user, password)
  if (!match) {
    throw new UnauthorizedError("Invalid credentials.")
  }

  if (!user.emailVerified) {
    throw new UnauthorizedError("Email not verified.", {
      data: { user: userSerializer(user) }
    })
  }

  const accessToken = generateAccess(user)
  const refreshToken = generateRefresh(user)

  return { accessToken, refreshToken, user }
}

export const logout = async (refreshToken) => {
  if (refreshToken) {
    await RevokedToken.create({ token: refreshToken })
  }
}

export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new ValidationError("Missing refresh token.")
  }

  const revokedToken = await RevokedToken.find(eq(RevokedToken.table.token, refreshToken))
  if (revokedToken) {
    throw new UnauthorizedError("Invalid refresh token.")
  }

  const user = await verifyRefresh(refreshToken)
  const accessToken = generateAccess(user)
  return accessToken
}
