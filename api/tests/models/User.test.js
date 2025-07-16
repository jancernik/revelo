import User from "../../models/User.js"
import { createUser } from "../testHelpers.js"

describe("User Model", () => {
  describe("findByEmail", () => {
    it("should find user by email", async () => {
      const user = await createUser({
        email: "test@example.com",
        username: "testuser"
      })

      const foundUser = await User.findByEmail("test@example.com")

      expect(foundUser).toBeDefined()
      expect(foundUser.id).toBe(user.id)
      expect(foundUser.email).toBe("test@example.com")
      expect(foundUser.username).toBe("testuser")
    })

    it("should return null for non-existent email", async () => {
      const user = await User.findByEmail("nonexistent@example.com")
      expect(user).toBeNull()
    })

    it("should handle case sensitivity correctly", async () => {
      await createUser({ email: "test@example.com" })

      const user = await User.findByEmail("TEST@EXAMPLE.COM")
      expect(user).toBeNull()
    })
  })

  describe("findByUsername", () => {
    it("should find user by username", async () => {
      const user = await createUser({
        email: "test@example.com",
        username: "uniqueuser"
      })

      const foundUser = await User.findByUsername("uniqueuser")

      expect(foundUser).toBeDefined()
      expect(foundUser.id).toBe(user.id)
      expect(foundUser.email).toBe("test@example.com")
      expect(foundUser.username).toBe("uniqueuser")
    })

    it("should return null for non-existent username", async () => {
      const user = await User.findByUsername("nonexistent")
      expect(user).toBeNull()
    })

    it("should handle case sensitivity correctly", async () => {
      await createUser({ username: "testuser" })

      const user = await User.findByUsername("TESTUSER")
      expect(user).toBeNull()
    })
  })

  describe("create", () => {
    it("should create user with hashed password", async () => {
      const timestamp = Date.now()
      const userData = {
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`,
        password: "Password12345"
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.username).toBe(userData.username)
      expect(user.password).not.toBe(userData.password)
      expect(user.admin).toBe(false)
      expect(user.emailVerified).toBe(false)
    })

    it("should create admin user", async () => {
      const timestamp = Date.now()
      const userData = {
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`,
        password: "Password123",
        admin: true
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.admin).toBe(true)
    })

    it("should create user with email verified", async () => {
      const timestamp = Date.now()
      const userData = {
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`,
        password: "Password123",
        emailVerified: true
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.emailVerified).toBe(true)
    })
  })

  describe("update", () => {
    let user

    beforeEach(async () => {
      user = await createUser()
    })

    it("should update user data", async () => {
      const updatedData = {
        email: "updated@example.com",
        username: "updateduser"
      }

      const updatedUser = await User.update(user.id, updatedData)

      expect(updatedUser).toBeDefined()
      expect(updatedUser.email).toBe(updatedData.email)
      expect(updatedUser.username).toBe(updatedData.username)
    })

    it("should hash password when updating", async () => {
      const updatedData = {
        password: "NewPassword123"
      }

      const updatedUser = await User.update(user.id, updatedData)

      expect(updatedUser).toBeDefined()
      expect(updatedUser.password).toBeDefined()
      expect(updatedUser.password).not.toBe(updatedData.password)
    })

    it("should update admin status", async () => {
      const updatedUser = await User.update(user.id, { admin: true })

      expect(updatedUser).toBeDefined()
      expect(updatedUser.admin).toBe(true)
    })

    it("should return null for non-existent user", async () => {
      const user = await User.update(999, { email: "test@example.com" })
      expect(user).toBeNull()
    })
  })

  describe("markEmailVerified", () => {
    let user

    beforeEach(async () => {
      user = await createUser({ emailVerified: false })
    })

    it("should mark email as verified", async () => {
      const updatedUser = await User.markEmailVerified(user.id)

      expect(updatedUser).toBeDefined()
      expect(updatedUser.emailVerified).toBe(true)
      expect(updatedUser.emailVerifiedAt).toBeDefined()
      expect(updatedUser.emailVerifiedAt).toBeInstanceOf(Date)
    })

    it("should return null for non-existent user", async () => {
      const user = await User.markEmailVerified(999)
      expect(user).toBeNull()
    })
  })

  describe("verifyPassword", () => {
    let user
    const password = "Password123"

    beforeEach(async () => {
      user = await createUser({ password })
    })

    it("should verify correct password", async () => {
      const isValid = await User.verifyPassword(user, password)
      expect(isValid).toBe(true)
    })

    it("should reject incorrect password", async () => {
      const isValid = await User.verifyPassword(user, "wrongpassword")
      expect(isValid).toBe(false)
    })

    it("should return false for null user", async () => {
      const isValid = await User.verifyPassword(null, password)
      expect(isValid).toBe(false)
    })

    it("should return false for undefined user", async () => {
      const isValid = await User.verifyPassword(undefined, password)
      expect(isValid).toBe(false)
    })

    it("should handle empty password", async () => {
      const isValid = await User.verifyPassword(user, "")
      expect(isValid).toBe(false)
    })
  })

  describe("inherited methods", () => {
    let user

    beforeEach(async () => {
      user = await createUser()
    })

    it("should find user by id", async () => {
      const foundUser = await User.findById(user.id)

      expect(foundUser).toBeDefined()
      expect(foundUser.id).toBe(user.id)
      expect(foundUser.email).toBe(user.email)
    })

    it("should return null for non-existent id", async () => {
      const nonexistentUser = await User.findById(999)
      expect(nonexistentUser).toBeNull()
    })

    it("should delete user", async () => {
      const deletedUser = await User.delete(user.id)

      expect(deletedUser).toBeDefined()
      expect(deletedUser.id).toBe(user.id)

      const nonexistentUser = await User.findById(user.id)
      expect(nonexistentUser).toBeNull()
    })

    it("should count users", async () => {
      await createUser()

      const firstCount = await User.count()
      expect(firstCount).toEqual(2)

      await createUser()

      const secondCount = await User.count()
      expect(secondCount).toEqual(3)
    })

    it("should find all users", async () => {
      await createUser()
      await createUser()

      const users = await User.findAll()
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toEqual(3)
    })
  })
})
