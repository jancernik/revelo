import { config } from "#src/config/environment.js"
import { NotFoundError } from "#src/core/errors.js"
import { errorHandler, notFoundHandler } from "#src/middlewares/errorMiddleware.js"
import { jest } from "@jest/globals"

describe("Error Middleware", () => {
  let next, req, res

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/test"
    }
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
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
        isOperational: true,
        message: "Bad request",
        statusCode: 400
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        data: null,
        status: "fail"
      })
    })

    it("should respond with \"status: 'error'\" and a message key for non-operational errors", () => {
      const error = {
        isOperational: false,
        message: "Some error message",
        statusCode: 500
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        message: "Some error message",
        status: "error"
      })
    })

    it("should include error data when present in operational errors", () => {
      const error = {
        data: { field: "email", issue: "required" },
        isOperational: true,
        message: "Validation error",
        statusCode: 422
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith({
        data: { field: "email", issue: "required" },
        status: "fail"
      })
    })

    it("should include error data when present in non-operational errors", () => {
      const error = {
        data: { connection: "failed" },
        isOperational: false,
        message: "Database error",
        statusCode: 500
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        data: { connection: "failed" },
        message: "Database error",
        status: "error"
      })
    })

    it("should log server errors (5xx)", () => {
      const error = {
        isOperational: false,
        message: "Database connection failed",
        stack: "Error stack trace",
        statusCode: 500
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      const loggedContent = console.error.mock.calls[0][1]
      expect(loggedContent).toContain("Database connection failed")
      expect(loggedContent).toContain("Error stack trace")
      expect(loggedContent).toContain("GET")
      expect(loggedContent).toContain("/test")
    })

    it("should not log client errors (4xx)", () => {
      const error = {
        isOperational: true,
        message: "Not found",
        statusCode: 404
      }

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(console.error).not.toHaveBeenCalled()
    })

    it("should use default message for production non-operational errors", () => {
      const originalEnv = config.ENV
      config.ENV = "production"

      const error = {
        isOperational: false,
        message: "Internal error details",
        statusCode: 500
      }

      errorHandler(error, req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
        status: "error"
      })

      config.ENV = originalEnv
    })

    it("should handle errors without message", () => {
      const error = {}

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error",
        status: "error"
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
