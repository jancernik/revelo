import jwt from "jsonwebtoken"

import { config } from "../config.js"
import { NotFoundError, UnauthorizedError } from "../errors.js"
import User, { userSerializer } from "../models/User.js"

const extractToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.split(" ")[1]
}

const verifyAndDecodeToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET)
  } catch {
    return null
  }
}

export const auth = {
  optional:
    (loadFullUser = false) =>
    async (req, res, next) => {
      const token = extractToken(req)

      if (!token) {
        req.user = null
        return next()
      }

      const decoded = verifyAndDecodeToken(token)
      if (!decoded) {
        req.user = null
        return next()
      }

      req.user = {
        admin: decoded.admin,
        email: decoded.email,
        id: decoded.id
      }

      if (loadFullUser) {
        const user = await User.findById(decoded.id)
        if (!user) {
          req.user = null
          return next()
        }
        req.user = userSerializer(user)
      }

      next()
    },

  required:
    (loadFullUser = false) =>
    async (req, res, next) => {
      const token = extractToken(req)

      if (!token) {
        throw new UnauthorizedError("Authorization required.")
      }

      const decoded = verifyAndDecodeToken(token)
      if (!decoded) {
        throw new UnauthorizedError("Invalid or expired token.")
      }

      if (!decoded.admin) {
        throw new UnauthorizedError("Authorization required.")
      }

      req.user = {
        admin: decoded.admin,
        email: decoded.email,
        id: decoded.id
      }

      if (loadFullUser) {
        const user = await User.findById(decoded.id)
        if (!user) {
          throw new NotFoundError("User not found.")
        }
        req.user = userSerializer(user)
      }

      next()
    }
}
