import jwt from "jsonwebtoken"

import { config } from "../config.js"
import { UnauthorizedError } from "../errors.js"

const ACCESS_EXPIRATION = 15 // minutes
const REFRESH_EXPIRATION = 90 // days

export const generateAccess = (user) => {
  return jwt.sign(
    {
      admin: user.admin,
      email: user.email,
      id: user.id
    },
    config.JWT_SECRET,
    { expiresIn: `${ACCESS_EXPIRATION}m` }
  )
}

export const generateRefresh = (user) => {
  return jwt.sign({ id: user.id }, config.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_EXPIRATION}d`
  })
}

export const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: REFRESH_EXPIRATION * 24 * 60 * 60 * 1000,
    sameSite: "Strict",
    secure: config.ENV === "production"
  })
}

export const verifyRefresh = async (token) => {
  return await new Promise((resolve, reject) => {
    jwt.verify(token, config.JWT_REFRESH_SECRET, (error, user) => {
      if (error) {
        reject(new UnauthorizedError("Session expired."))
      } else {
        resolve(user)
      }
    })
  })
}
