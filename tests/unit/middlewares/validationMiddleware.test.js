import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { validateBody } from '../../../api/middlewares/validationMiddleware.js'
import { ValidationError } from '../../../api/errors.js'
import { z } from 'zod'

describe('Validation Middleware', () => {
  let req, res, next

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })

  beforeEach(() => {
    req = { body: {} }
    res = {}
    next = jest.fn()

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('validate', () => {
    it('should call next when validation passes', () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should call next with ValidationError when validation fails', () => {
      req.body = {
        email: 'invalid-email',
        password: '123'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should include formatted error messages in ValidationError', () => {
      req.body = {
        email: 'invalid-email',
        password: '123'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid email')
        })
      )
    })

    it('should include error data in ValidationError', () => {
      req.body = {
        email: 'invalid-email',
        password: '123'
      }

      const middleware = validateBody(schema)

      try {
        middleware(req, res, next)
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.data).toBeDefined()
        expect(Array.isArray(error.data)).toBe(true)
        expect(error.data.length).toBeGreaterThan(0)
      }
    })

    it('should handle empty request body', () => {
      req.body = {}

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should handle missing fields', () => {
      req.body = {
        email: 'test@example.com'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('expected string, received undefined')
        })
      )
    })

    it('should handle extra fields (should pass with strict schema)', () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        extraField: 'should be ignored'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should work with different schema types', () => {
      const numberSchema = z.object({
        age: z.number().min(0).max(150)
      })

      req.body = { age: 25 }

      const middleware = validateBody(numberSchema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should handle array schemas', () => {
      const arraySchema = z.object({
        tags: z.array(z.string())
      })

      req.body = { tags: ['tag1', 'tag2'] }

      const middleware = validateBody(arraySchema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should handle nested object schemas', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email()
        })
      })

      req.body = {
        user: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      }

      const middleware = validateBody(nestedSchema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should call next with non-zod errors', () => {
      const mockSchema = {
        parse: jest.fn(() => {
          throw new Error('Some other error')
        })
      }

      const middleware = validateBody(mockSchema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(next).not.toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should call next with error when validation fails', () => {
      req.body = {
        email: 'invalid-email',
        password: '123'
      }

      const middleware = validateBody(schema)
      middleware(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })
})
