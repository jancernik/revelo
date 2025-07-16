import { config } from "#src/config/environment.js"
import { NotFoundError, UnauthorizedError } from "#src/core/errors.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import User from "#src/models/User.js"
import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import jwt from "jsonwebtoken"

describe("Auth Middleware", () => {
  let next, req, res

  const mockUser = {
    admin: false,
    email: "test@example.com",
    emailVerified: true,
    id: 1,
    username: "testuser"
  }

  beforeEach(() => {
    req = { headers: {} }
    res = {}
    next = jest.fn()

    jest.clearAllMocks()
    jest.spyOn(User, "findById").mockResolvedValue(mockUser)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("auth.required", () => {
    describe("without loadFullUser", () => {
      it("should authenticate valid token and set basic user info", async () => {
        const token = jwt.sign({ admin: true, email: "test@example.com", id: 1 }, config.JWT_SECRET)
        req.headers.authorization = `Bearer ${token}`

        await auth.required()(req, res, next)

        expect(req.user).toEqual({
          admin: true,
          email: "test@example.com",
          id: 1
        })
        expect(User.findById).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it("should throw UnauthorizedError when no token provided", async () => {
        await expect(auth.required()(req, res, next)).rejects.toThrow(UnauthorizedError)
        await expect(auth.required()(req, res, next)).rejects.toThrow("Authorization required.")
      })

      it("should throw UnauthorizedError when token is invalid", async () => {
        req.headers.authorization = "Bearer invalid-token"

        await expect(auth.required()(req, res, next)).rejects.toThrow(UnauthorizedError)
        await expect(auth.required()(req, res, next)).rejects.toThrow("Invalid or expired token.")
      })

      it("should throw UnauthorizedError when authorization header is malformed", async () => {
        req.headers.authorization = "InvalidFormat token"

        await expect(auth.required()(req, res, next)).rejects.toThrow(UnauthorizedError)
        await expect(auth.required()(req, res, next)).rejects.toThrow("Authorization required.")
      })

      it("should handle admin users correctly", async () => {
        const token = jwt.sign(
          { admin: true, email: "admin@example.com", id: 1 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`

        await auth.required()(req, res, next)

        expect(req.user).toEqual({
          admin: true,
          email: "admin@example.com",
          id: 1
        })
        expect(next).toHaveBeenCalled()
      })
    })

    describe("with loadFullUser = true", () => {
      it("should load full user from database", async () => {
        const token = jwt.sign({ admin: true, email: "test@example.com", id: 1 }, config.JWT_SECRET)
        req.headers.authorization = `Bearer ${token}`

        await auth.required(true)(req, res, next)

        expect(User.findById).toHaveBeenCalledWith(1)
        expect(req.user).toEqual(mockUser)
        expect(next).toHaveBeenCalled()
      })

      it("should throw NotFoundError when user not found in database", async () => {
        const token = jwt.sign(
          { admin: true, email: "nonexistent@example.com", id: 999 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`
        User.findById.mockResolvedValue(null)

        await expect(auth.required(true)(req, res, next)).rejects.toThrow(NotFoundError)
        await expect(auth.required(true)(req, res, next)).rejects.toThrow("User not found.")
      })
    })
  })

  describe("auth.optional", () => {
    describe("without loadFullUser", () => {
      it("should authenticate valid token and set basic user info", async () => {
        const token = jwt.sign(
          { admin: false, email: "test@example.com", id: 1 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`

        await auth.optional()(req, res, next)

        expect(req.user).toEqual({
          admin: false,
          email: "test@example.com",
          id: 1
        })
        expect(User.findById).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it("should set user to null when no token provided", async () => {
        await auth.optional()(req, res, next)

        expect(req.user).toBeNull()
        expect(User.findById).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it("should set user to null when token is invalid", async () => {
        req.headers.authorization = "Bearer invalid-token"

        await auth.optional()(req, res, next)

        expect(req.user).toBeNull()
        expect(User.findById).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })

      it("should set user to null when authorization header is malformed", async () => {
        req.headers.authorization = "InvalidFormat token"

        await auth.optional()(req, res, next)

        expect(req.user).toBeNull()
        expect(next).toHaveBeenCalled()
      })

      it("should handle admin users correctly", async () => {
        const token = jwt.sign(
          { admin: true, email: "admin@example.com", id: 1 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`

        await auth.optional()(req, res, next)

        expect(req.user).toEqual({
          admin: true,
          email: "admin@example.com",
          id: 1
        })
        expect(next).toHaveBeenCalled()
      })
    })

    describe("with loadFullUser = true", () => {
      it("should load full user from database when valid token", async () => {
        const token = jwt.sign(
          { admin: false, email: "test@example.com", id: 1 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`

        await auth.optional(true)(req, res, next)

        expect(User.findById).toHaveBeenCalledWith(1)
        expect(req.user).toEqual(mockUser)
        expect(next).toHaveBeenCalled()
      })

      it("should set user to null when user not found in database", async () => {
        const token = jwt.sign(
          { admin: false, email: "nonexistent@example.com", id: 999 },
          config.JWT_SECRET
        )
        req.headers.authorization = `Bearer ${token}`
        User.findById.mockResolvedValue(null)

        await auth.optional(true)(req, res, next)

        expect(req.user).toBeNull()
        expect(next).toHaveBeenCalled()
      })

      it("should set user to null when no token and not load from database", async () => {
        await auth.optional(true)(req, res, next)

        expect(req.user).toBeNull()
        expect(User.findById).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
      })
    })
  })

  describe("token extraction", () => {
    it("should handle missing authorization header", async () => {
      await auth.optional()(req, res, next)
      expect(req.user).toBeNull()
    })

    it("should handle empty authorization header", async () => {
      req.headers.authorization = ""
      await auth.optional()(req, res, next)
      expect(req.user).toBeNull()
    })

    it("should handle authorization header without Bearer prefix", async () => {
      req.headers.authorization = "token123"
      await auth.optional()(req, res, next)
      expect(req.user).toBeNull()
    })

    it("should handle authorization header with only Bearer", async () => {
      req.headers.authorization = "Bearer"
      await auth.optional()(req, res, next)
      expect(req.user).toBeNull()
    })

    it("should handle authorization header with Bearer and space but no token", async () => {
      req.headers.authorization = "Bearer "
      await auth.optional()(req, res, next)
      expect(req.user).toBeNull()
    })
  })

  describe("JWT payload validation", () => {
    it("should handle token with missing id", async () => {
      const token = jwt.sign({ admin: false, email: "test@example.com" }, config.JWT_SECRET)
      req.headers.authorization = `Bearer ${token}`

      await auth.optional()(req, res, next)

      expect(req.user).toEqual({
        admin: false,
        email: "test@example.com",
        id: undefined
      })
    })

    it("should handle token with missing email", async () => {
      const token = jwt.sign({ admin: false, id: 1 }, config.JWT_SECRET)
      req.headers.authorization = `Bearer ${token}`

      await auth.optional()(req, res, next)

      expect(req.user).toEqual({
        admin: false,
        email: undefined,
        id: 1
      })
    })

    it("should handle token with missing admin field", async () => {
      const token = jwt.sign({ email: "test@example.com", id: 1 }, config.JWT_SECRET)
      req.headers.authorization = `Bearer ${token}`

      await auth.optional()(req, res, next)

      expect(req.user).toEqual({
        admin: undefined,
        email: "test@example.com",
        id: 1
      })
    })
  })
})
