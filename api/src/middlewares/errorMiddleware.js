import { config } from "../config/environment.js"
import { NotFoundError } from "../core/errors.js"

export const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500
  const message =
    config.ENV === "production" && !error.isOperational
      ? "Something went wrong"
      : error.message || "Internal server error"

  if (statusCode >= 500) {
    console.error("Server Error:", {
      message: error.message,
      method: req.method,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: req.originalUrl
    })
  }

  const response = {
    status: error.isOperational ? "fail" : "error"
  }

  if (!error.isOperational) {
    response.message = message
  }

  if (error.isOperational) {
    response.data = error.data || null
  } else if (error.data) {
    response.data = error.data
  }

  res.status(statusCode).json(response)
}

export const notFoundHandler = (req, _res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`)
  next(error)
}
