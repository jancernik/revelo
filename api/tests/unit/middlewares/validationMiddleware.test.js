import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { z } from "zod"

import { ValidationError } from "../../../src/core/errors.js"
import { validate } from "../../../src/middlewares/validationMiddleware.js"

describe("Validation Middleware", () => {
  let req, res, next

  const bodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })

  const querySchema = z.object({
    limit: z.string().transform(Number).optional(),
    offset: z.string().transform(Number).optional()
  })

  const paramsSchema = z.object({
    id: z.string().uuid()
  })

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      headers: {}
    }
    res = {}
    next = jest.fn()

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("validate", () => {
    it("should validate body when body schema is provided", () => {
      req.body = {
        email: "test@example.com",
        password: "password123"
      }

      const middleware = validate({ body: bodySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.email).toBe("test@example.com")
    })

    it("should validate query when query schema is provided", () => {
      req.query = {
        limit: "10",
        offset: "20"
      }

      const middleware = validate({ query: querySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.parsedQuery.limit).toBe(10)
      expect(req.parsedQuery.offset).toBe(20)
    })

    it("should validate params when params schema is provided", () => {
      req.params = {
        id: "123e4567-e89b-12d3-a456-426614174000"
      }

      const middleware = validate({ params: paramsSchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.params.id).toBe("123e4567-e89b-12d3-a456-426614174000")
    })

    it("should validate multiple parts simultaneously", () => {
      req.body = {
        email: "test@example.com",
        password: "password123"
      }
      req.query = {
        limit: "10"
      }
      req.params = {
        id: "123e4567-e89b-12d3-a456-426614174000"
      }

      const middleware = validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema
      })
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.email).toBe("test@example.com")
      expect(req.parsedQuery.limit).toBe(10)
      expect(req.params.id).toBe("123e4567-e89b-12d3-a456-426614174000")
    })

    it("should call next with ValidationError when body validation fails", () => {
      req.body = {
        email: "invalid-email",
        password: "123"
      }

      const middleware = validate({ body: bodySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it("should include formatted error messages in ValidationError", () => {
      req.body = {
        email: "invalid-email",
        password: "123"
      }

      const middleware = validate({ body: bodySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid email")
        })
      )
    })

    it("should handle empty request body", () => {
      req.body = {}

      const middleware = validate({ body: bodySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it("should skip validation when no schemas provided", () => {
      const middleware = validate({})
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it("should only validate provided schemas", () => {
      req.body = {
        email: "test@example.com",
        password: "password123"
      }
      req.query = { invalidQuery: "should not be validated" }

      const middleware = validate({ body: bodySchema })
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.email).toBe("test@example.com")
      expect(req.query.invalidQuery).toBe("should not be validated")
    })

    it("should collect validation errors from multiple schemas", () => {
      req.body = {
        email: "invalid-email",
        password: "123"
      }
      req.query = {
        limit: "not-a-number"
      }
      req.params = {
        id: "not-a-uuid"
      }

      const middleware = validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema
      })
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))

      const error = next.mock.calls[0][0]
      expect(error.data.validation.length).toBeGreaterThan(1)
      expect(error.message).toContain("Invalid email")
      expect(error.message).toContain("Too small")
      expect(error.message).toContain("Invalid UUID")
    })
  })
})
