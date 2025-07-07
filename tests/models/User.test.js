import { describe, it, expect, beforeEach } from '@jest/globals'
import { createUser } from '../testHelpers.js'
import User from '../../api/models/User.js'

const DEFAULT_USER_DATA = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'testpassword123',
  admin: false,
  emailVerified: false
}

describe('User Model', () => {
  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const testUser = await createUser({
        email: 'test@example.com',
        username: 'testuser'
      })

      const user = await User.findByEmail('test@example.com')

      expect(user).toBeDefined()
      expect(user.id).toBe(testUser.id)
      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
    })

    it('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com')
      expect(user).toBeNull()
    })

    it('should handle case sensitivity correctly', async () => {
      await createUser({
        email: 'test@example.com',
        username: 'testuser'
      })

      const user = await User.findByEmail('TEST@EXAMPLE.COM')
      expect(user).toBeNull()
    })
  })

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const testUser = await createUser({
        email: 'user@example.com',
        username: 'uniqueuser'
      })

      const user = await User.findByUsername('uniqueuser')

      expect(user).toBeDefined()
      expect(user.id).toBe(testUser.id)
      expect(user.username).toBe('uniqueuser')
      expect(user.email).toBe('user@example.com')
    })

    it('should return null for non-existent username', async () => {
      const user = await User.findByUsername('nonexistent')
      expect(user).toBeNull()
    })

    it('should handle case sensitivity correctly', async () => {
      await createUser({
        email: 'test@example.com',
        username: 'testuser'
      })

      const user = await User.findByUsername('TESTUSER')
      expect(user).toBeNull()
    })
  })

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const timestamp = Date.now()
      const originalPassword = DEFAULT_USER_DATA.password
      const userData = {
        ...DEFAULT_USER_DATA,
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.username).toBe(userData.username)
      expect(user.password).toBeDefined()
      expect(user.password).not.toBe(originalPassword)
      expect(user.admin).toBe(false)
      expect(user.emailVerified).toBe(false)
    })

    it('should create admin user', async () => {
      const timestamp = Date.now()
      const userData = {
        ...DEFAULT_USER_DATA,
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`,
        admin: true
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.admin).toBe(true)
    })

    it('should create user with email verified', async () => {
      const timestamp = Date.now()
      const userData = {
        ...DEFAULT_USER_DATA,
        email: `test-${timestamp}@example.com`,
        username: `testuser-${timestamp}`,
        emailVerified: true
      }
      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.emailVerified).toBe(true)
    })
  })

  describe('update', () => {
    let testUser

    beforeEach(async () => {
      testUser = await createUser()
    })

    it('should update user data', async () => {
      const updatedData = {
        email: 'updated@example.com',
        username: 'updateduser'
      }

      const user = await User.update(testUser.id, updatedData)

      expect(user).toBeDefined()
      expect(user.email).toBe(updatedData.email)
      expect(user.username).toBe(updatedData.username)
    })

    it('should hash password when updating', async () => {
      const newPassword = 'newpassword123'
      const user = await User.update(testUser.id, { password: newPassword })

      expect(user).toBeDefined()
      expect(user.password).toBeDefined()
      expect(user.password).not.toBe(newPassword)
    })

    it('should update admin status', async () => {
      const user = await User.update(testUser.id, { admin: true })

      expect(user).toBeDefined()
      expect(user.admin).toBe(true)
    })

    it('should return null for non-existent user', async () => {
      const user = await User.update(99999, { email: 'test@example.com' })
      expect(user).toBeNull()
    })
  })

  describe('markEmailVerified', () => {
    let testUser

    beforeEach(async () => {
      testUser = await createUser({ emailVerified: false })
    })

    it('should mark email as verified', async () => {
      const user = await User.markEmailVerified(testUser.id)

      expect(user).toBeDefined()
      expect(user.emailVerified).toBe(true)
      expect(user.emailVerifiedAt).toBeDefined()
      expect(user.emailVerifiedAt).toBeInstanceOf(Date)
    })

    it('should update emailVerifiedAt timestamp', async () => {
      const beforeTime = new Date()
      const user = await User.markEmailVerified(testUser.id)
      const afterTime = new Date()

      expect(user.emailVerifiedAt).toBeDefined()
      expect(user.emailVerifiedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(user.emailVerifiedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should return null for non-existent user', async () => {
      const user = await User.markEmailVerified(99999)
      expect(user).toBeNull()
    })
  })

  describe('verifyPassword', () => {
    let testUser
    const testPassword = 'testpassword123'

    beforeEach(async () => {
      testUser = await createUser({ password: testPassword })
    })

    it('should verify correct password', async () => {
      const isValid = await User.verifyPassword(testUser, testPassword)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const isValid = await User.verifyPassword(testUser, 'wrongpassword')
      expect(isValid).toBe(false)
    })

    it('should return false for user without password', async () => {
      const userWithoutPassword = await createUser()
      userWithoutPassword.password = null

      const isValid = await User.verifyPassword(userWithoutPassword, testPassword)
      expect(isValid).toBe(false)
    })

    it('should return false for null user', async () => {
      const isValid = await User.verifyPassword(null, testPassword)
      expect(isValid).toBe(false)
    })

    it('should return false for undefined user', async () => {
      const isValid = await User.verifyPassword(undefined, testPassword)
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      const isValid = await User.verifyPassword(testUser, '')
      expect(isValid).toBe(false)
    })
  })

  describe('inherited methods', () => {
    let testUser

    beforeEach(async () => {
      testUser = await createUser()
    })

    it('should find user by id', async () => {
      const user = await User.findById(testUser.id)

      expect(user).toBeDefined()
      expect(user.id).toBe(testUser.id)
      expect(user.email).toBe(testUser.email)
    })

    it('should return null for non-existent id', async () => {
      const user = await User.findById(99999)
      expect(user).toBeNull()
    })

    it('should delete user', async () => {
      const deletedUser = await User.delete(testUser.id)

      expect(deletedUser).toBeDefined()
      expect(deletedUser.id).toBe(testUser.id)

      const foundUser = await User.findById(testUser.id)
      expect(foundUser).toBeNull()
    })

    it('should count users', async () => {
      await createUser()
      await createUser()

      const count = await User.count()
      expect(count).toBeGreaterThanOrEqual(3)
    })

    it('should find all users', async () => {
      await createUser()
      await createUser()

      const users = await User.findAll()
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThanOrEqual(3)
    })
  })
})
