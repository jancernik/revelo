import { beforeEach, describe, expect, it, jest } from "@jest/globals"

import { config } from "../../../config.js"
import { NotFoundError } from "../../../errors.js"
import { errorHandler, notFoundHandler } from "../../../middlewares/errorMiddleware.js"

describe("Error Middleware", () => {
  let req, res, next

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/test"
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    console.error = jest.fn()

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("errorHandler", () => {
    it("should respond with \"status: 'fail'\" and a data key for operational errors", () => {
      const error = {
        statusCode: 400,
        message: "Bad request",
        isOperational: true
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        status: "fail",
        data: null
      })
    })

    it("should respond with \"status: 'error'\" and a message key for non-operational errors", () => {
      const error = {
        statusCode: 500,
        message: "Some error message",
        isOperational: false
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Some error message"
      })
    })

    it("should include error data when present in operational errors", () => {
      const error = {
        statusCode: 422,
        message: "Validation error",
        isOperational: true,
        data: { field: "email", issue: "required" }
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        status: "fail",
        data: { field: "email", issue: "required" }
      })
    })

    it("should include error data when present in non-operational errors", () => {
      const error = {
        statusCode: 500,
        message: "Database error",
        isOperational: false,
        data: { connection: "failed" }
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Database error",
        data: { connection: "failed" }
      })
    })

    it("should log server errors (5xx)", () => {
      const error = {
        statusCode: 500,
        message: "Database connection failed",
        stack: "Error stack trace",
        isOperational: false
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(console.error).toHaveBeenCalledWith("Server Error:", {
        message: "Database connection failed",
        method: "GET",
        stack: "Error stack trace",
        timestamp: expect.any(String),
        url: "/test"
      })
    })

    it("should not log client errors (4xx)", () => {
      const error = {
        statusCode: 404,
        message: "Not found",
        isOperational: true
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(console.error).not.toHaveBeenCalled()
    })

    it("should use default message for production non-operational errors", () => {
      const originalEnv = config.ENV
      config.ENV = "production"

      const error = {
        statusCode: 500,
        message: "Internal error details",
        isOperational: false
      }

      errorHandler(error, req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Something went wrong"
      })

      config.ENV = originalEnv
    })

    it("should handle errors without message", () => {
      const error = {}

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error"
      })
    })
  })

  describe("notFoundHandler", () => {
    it("should create NotFoundError and pass to next middleware", () => {
      notFoundHandler(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      const error = next.mock.calls[0][0]

      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe("Route /test not found")
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })

    it("should use correct route URL in error message", () => {
      req.originalUrl = "/api/users/123"

      notFoundHandler(req, res, next)

      const error = next.mock.calls[0][0]

      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.message).toBe("Route /api/users/123 not found")
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })
  })
})
