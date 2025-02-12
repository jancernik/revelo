import jwt from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXPIRATION = 15 // minutes
const REFRESH_EXPIRATION = 90 // days

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: `${ACCESS_EXPIRATION}m` })
}

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRATION}d` })
}

export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: REFRESH_EXPIRATION * 24 * 60 * 60 * 1000
  })
}

export const verifyRefreshToken = (token, callback) => {
  jwt.verify(token, REFRESH_SECRET, (error, user) => {
    if (error) {
      return callback(error, null)
    }
    callback(null, user)
  })
}
