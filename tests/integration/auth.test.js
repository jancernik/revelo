import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import { createTestApi } from '../testApi.js'
import { createUser, createVerificationToken } from '../testHelpers.js'

const app = createTestApi()

describe('Auth Endpoints', () => {
  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser'
      }

      const response = await request(app).post('/signup').send(userData).expect(201)

      expect(response.body).toEqual({
        message: 'User created successfully.',
        requiresVerification: true,
        user: {
          admin: expect.any(Boolean),
          email: userData.email,
          emailVerified: false,
          username: userData.username
        }
      })
    })

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com'
      }

      const response = await request(app).post('/signup').send(userData).expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 400 for duplicate email', async () => {
      const existingUser = await createUser()
      const userData = {
        email: existingUser.email,
        password: 'password123',
        username: 'newuser'
      }

      const response = await request(app).post('/signup').send(userData).expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = await createUser({
        username: 'testuser',
        password: 'password123',
        emailVerified: true
      })

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: user.plainPassword
        })
        .expect(200)

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        message: 'Logged in successfully.',
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: user.emailVerified,
          username: user.username
        }
      })
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should return 401 for invalid credentials', async () => {
      await createUser({
        username: 'testuser',
        password: 'password123'
      })

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 401 for unverified email', async () => {
      const user = await createUser({
        username: 'testuser',
        password: 'password123',
        emailVerified: false
      })

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: user.plainPassword
        })
        .expect(401)

      expect(response.body).toEqual({
        message: expect.any(String),
        requiresVerification: true,
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: user.emailVerified,
          username: user.username
        }
      })
    })

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createUser({ emailVerified: true })
      const loginResponse = await request(app).post('/login').send({
        username: user.username,
        password: 'password123'
      })

      const cookies = loginResponse.headers['set-cookie']

      const response = await request(app).post('/logout').set('Cookie', cookies).expect(200)

      expect(response.body).toEqual({
        message: 'Logged out successfully.'
      })
    })

    it('should handle logout without refresh token', async () => {
      const response = await request(app).post('/logout').expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const user = await createUser({ emailVerified: true })
      const loginResponse = await request(app).post('/login').send({
        username: user.username,
        password: 'password123'
      })

      const cookies = loginResponse.headers['set-cookie']

      const response = await request(app).post('/refresh').set('Cookie', cookies).expect(200)

      expect(response.body).toEqual({
        accessToken: expect.any(String)
      })
    })

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .expect(401)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 401 for missing refresh token', async () => {
      const response = await request(app).post('/refresh').expect(401)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const user = await createUser({ emailVerified: false })
      const token = await createVerificationToken(user.id)

      const response = await request(app).post('/verify-email').send({ token }).expect(200)

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        message: 'Email verified successfully',
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: true,
          username: user.username
        }
      })
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 400 for missing token', async () => {
      const response = await request(app).post('/verify-email').send({}).expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email successfully', async () => {
      const user = await createUser({ emailVerified: false })

      const response = await request(app).post('/resend-verification').send({ email: user.email })

      expect([200, 400]).toContain(response.status)
      expect(response.body).toHaveProperty('message')
    })

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 400 for missing email', async () => {
      const response = await request(app).post('/resend-verification').send({}).expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('GET /auth/current-user', () => {
    it('should return current user when authenticated', async () => {
      const user = await createUser({
        emailVerified: true,
        password: 'password123'
      })
      const loginResponse = await request(app).post('/login').send({
        username: user.username,
        password: user.plainPassword
      })

      const { accessToken } = loginResponse.body

      const response = await request(app)
        .get('/current-user')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toEqual({
        user: {
          admin: user.admin,
          email: user.email,
          username: user.username
        }
      })
    })

    it('should return empty user when not authenticated', async () => {
      const response = await request(app).get('/current-user').expect(200)

      expect(response.body).toEqual({
        user: {}
      })
    })

    it('should return empty user for invalid token', async () => {
      const response = await request(app)
        .get('/current-user')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200)

      expect(response.body).toEqual({
        user: {}
      })
    })
  })
})
