import { createUser, createVerificationToken } from "#tests/testHelpers.js"
import { createTestServer } from "#tests/testServer.js"
import { describe, expect, it } from "@jest/globals"
import request from "supertest"

const api = createTestServer()

describe("Auth Endpoints", () => {
  describe("POST /signup", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "Password123",
        username: "newuser"
      }

      const response = await request(api).post("/signup").send(userData).expect(201)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toEqual({
        user: {
          admin: expect.any(Boolean),
          email: userData.email,
          emailVerified: false,
          id: expect.any(Number),
          username: userData.username
        }
      })
    })

    it("should return 400 for missing required fields", async () => {
      const userData = { email: "test@example.com", password: "Password123" }

      const response = await request(api).post("/signup").send(userData).expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeDefined()
    })

    it("should return 400 when fields are invalid", async () => {
      const userData = { email: "test@example.com", password: "short" }

      const response = await request(api).post("/signup").send(userData).expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeDefined()
    })

    it("should return 400 for duplicate email", async () => {
      const existingUser = await createUser()
      const userData = {
        email: existingUser.email,
        password: "Password123",
        username: "newuser"
      }

      const response = await request(api).post("/signup").send(userData).expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      const user = await createUser({
        emailVerified: true,
        password: "Password123",
        username: "testuser"
      })

      const response = await request(api)
        .post("/login")
        .send({
          password: "Password123",
          username: "testuser"
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          username: user.username
        }
      })
      expect(response.headers["set-cookie"]).toBeDefined()
    })

    it("should return 401 for invalid credentials", async () => {
      await createUser({
        password: "Password123",
        username: "testuser"
      })

      const response = await request(api)
        .post("/login")
        .send({
          password: "wrongpassword",
          username: "testuser"
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unverified email", async () => {
      const user = await createUser({
        emailVerified: false,
        password: "Password123",
        username: "testuser"
      })

      const response = await request(api)
        .post("/login")
        .send({
          password: "Password123",
          username: "testuser"
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toEqual({
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          username: user.username
        }
      })
    })

    it("should return 401 for non-existent user", async () => {
      const response = await request(api)
        .post("/login")
        .send({
          password: "Password123",
          username: "nonexistent"
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /logout", () => {
    it("should logout successfully", async () => {
      const user = await createUser({ emailVerified: true })
      const loginResponse = await request(api).post("/login").send({
        password: user.plainPassword,
        username: user.username
      })

      const cookies = loginResponse.headers["set-cookie"]
      const response = await request(api).post("/logout").set("Cookie", cookies).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()
    })

    it("should handle logout without refresh token", async () => {
      const response = await request(api).post("/logout").expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /refresh", () => {
    it("should refresh access token successfully", async () => {
      const user = await createUser({ emailVerified: true })
      const loginResponse = await request(api).post("/login").send({
        password: user.plainPassword,
        username: user.username
      })

      const cookies = loginResponse.headers["set-cookie"]
      const response = await request(api).post("/refresh").set("Cookie", cookies).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toEqual({ accessToken: expect.any(String) })
    })

    it("should return 401 for invalid refresh token", async () => {
      const response = await request(api)
        .post("/refresh")
        .set("Cookie", ["refreshToken=invalid-token"])
        .expect(401)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 400 for missing refresh token", async () => {
      const response = await request(api).post("/refresh").expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /verify-email", () => {
    it("should verify email successfully", async () => {
      const user = await createUser({ emailVerified: false })
      const token = await createVerificationToken(user.id)

      const response = await request(api).post("/verify-email").send({ token }).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        user: {
          admin: user.admin,
          email: user.email,
          emailVerified: true,
          id: user.id,
          username: user.username
        }
      })
      expect(response.headers["set-cookie"]).toBeDefined()
    })

    it("should return 400 for invalid token", async () => {
      const response = await request(api)
        .post("/verify-email")
        .send({ token: "invalidtoken" })
        .expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should fail validation and return 400 for missing token", async () => {
      const response = await request(api).post("/verify-email").send({}).expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeDefined()
    })
  })

  describe("POST /resend-verification", () => {
    it("should resend verification email successfully", async () => {
      const user = await createUser({ emailVerified: false })

      const response = await request(api)
        .post("/resend-verification")
        .send({ email: user.email })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()
    })

    it("should return 400 for invalid email", async () => {
      const response = await request(api)
        .post("/resend-verification")
        .send({ email: "nonexistent@example.com" })
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should fail validation and return 400 for missing email", async () => {
      const response = await request(api).post("/resend-verification").send({}).expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeDefined()
    })
  })
})
