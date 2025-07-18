import { createAccessToken, createAdminUser } from "#tests/helpers/authHelpers.js"
import { createImage, createImages, createMockFile } from "#tests/helpers/imageHelpers.js"
import { createTestServer } from "#tests/testServer.js"
import request from "supertest"
import { v4 as uuid } from "uuid"

const api = createTestServer()

describe("Image Endpoints", () => {
  let adminUserToken

  beforeAll(async () => {
    const adminUser = await createAdminUser()
    adminUserToken = createAccessToken(adminUser)
  })

  describe("GET /images", () => {
    it("should get images successfully", async () => {
      await createImages(3)

      const response = await request(api).get("/images").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })

    it("should get images with limit", async () => {
      await createImages(5)

      const response = await request(api).get("/images?limit=2").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(2)
    })

    it("should get images with offset", async () => {
      await createImages(5)

      const response = await request(api).get("/images?offset=2").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })
  })

  describe("GET /tiny-images", () => {
    it("should get tiny images successfully", async () => {
      await createImages(2)

      const response = await request(api).get("/tiny-images").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
    })
  })

  describe("GET /images/:id", () => {
    it("should get image by id successfully", async () => {
      const image = await createImage()

      const response = await request(api).get(`/images/${image.id}`).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.image).toEqual({
        aperture: image.aperture,
        camera: image.camera,
        date: image.date.toISOString(),
        focalLength: image.focalLength,
        id: image.id,
        iso: image.iso,
        lens: image.lens,
        originalFilename: image.originalFilename,
        shutterSpeed: image.shutterSpeed,
        versions: []
      })
    })

    it("should return 404 for non-existent image", async () => {
      const response = await request(api)
        .get("/images/550e8400-e29b-41d4-a716-446655440000")
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 404 for invalid image id", async () => {
      const response = await request(api).get("/images/invalid").expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /upload/review", () => {
    it("should upload single image for review", async () => {
      const mockFile = createMockFile("test.png")

      const response = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .attach("images", mockFile.buffer, "test.png")
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty("sessionId")
      expect(response.body.data.images[0]).toHaveProperty("metadata")
      expect(response.body.data.images[0]).toHaveProperty("filePath")
    })

    it("should upload multiple images for review", async () => {
      const mockFile1 = createMockFile("test1.png")
      const mockFile2 = createMockFile("test2.png")

      const response = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .attach("images", mockFile1.buffer, "test1.png")
        .attach("images", mockFile2.buffer, "test2.png")
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images).toHaveLength(2)
      expect(response.body.data.images[0]).toHaveProperty("sessionId")
      expect(response.body.data.images[1]).toHaveProperty("sessionId")
    })

    it("should return 400 for no files uploaded", async () => {
      const response = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toEqual({ validation: [{ message: "No files uploaded" }] })
    })

    it("should return 401 for unauthenticated request", async () => {
      const mockFile = createMockFile("test.png")

      const response = await request(api)
        .post("/upload/review")
        .attach("image", mockFile.buffer, "test.png")
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("POST /upload/confirm", () => {
    let sessionId

    beforeEach(async () => {
      const mockFile = createMockFile("test.png")
      const uploadResponse = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .attach("images", mockFile.buffer, "test.png")
      sessionId = uploadResponse.body.data.images[0].sessionId
    })

    it("should confirm single image upload with sessionId and metadata", async () => {
      const metadata = {
        aperture: "f/4",
        camera: "Canon EOS R5",
        focalLength: "50mm",
        iso: "400",
        lens: "24-70mm f/2.8",
        shutterSpeed: "1/60"
      }

      const response = await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ images: [{ metadata, sessionId }] })
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty("id")
      expect(response.body.data.images[0].camera).toBe(metadata.camera)
      expect(response.body.data.images[0].lens).toBe(metadata.lens)
    })

    it("should confirm single image upload with image object", async () => {
      const imageData = {
        metadata: {
          camera: "Sony A7R V",
          iso: "200"
        },
        sessionId
      }

      const response = await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ images: [imageData] })
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty("id")
      expect(response.body.data.images[0].camera).toBe(imageData.metadata.camera)
    })

    it("should confirm multiple images upload with images array", async () => {
      const mockFile2 = createMockFile("test2.png")
      const uploadResponse2 = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .attach("images", mockFile2.buffer, "test2.png")
      const sessionId2 = uploadResponse2.body.data.images[0].sessionId

      const imagesData = [
        {
          metadata: { camera: "Canon EOS R5" },
          sessionId
        },
        {
          metadata: { camera: "Sony A7R V" },
          sessionId: sessionId2
        }
      ]

      const response = await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ images: imagesData })
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images).toHaveLength(2)
      expect(response.body.data.images[0].camera).toBe("Canon EOS R5")
      expect(response.body.data.images[1].camera).toBe("Sony A7R V")
    })

    it("should return 400 for missing required fields", async () => {
      const response = await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 404 for expired session", async () => {
      const fakeSessionId = uuid()

      const response = await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          images: [
            {
              metadata: {},
              sessionId: fakeSessionId
            }
          ]
        })
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api)
        .post("/upload/confirm")
        .send({
          images: [{ metadata: {}, sessionId }]
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("PUT /images/:id/metadata", () => {
    let image

    beforeEach(async () => {
      image = await createImage()
    })

    it("should update image metadata successfully", async () => {
      const newMetadata = {
        aperture: "f/1.4",
        camera: "Updated Camera",
        iso: "800",
        lens: "Updated Lens"
      }

      const response = await request(api)
        .put(`/images/${image.id}/metadata`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send(newMetadata)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.image.camera).toBe(newMetadata.camera)
      expect(response.body.data.image.lens).toBe(newMetadata.lens)
      expect(response.body.data.image.aperture).toBe(newMetadata.aperture)
      expect(response.body.data.image.iso).toBe(parseInt(newMetadata.iso, 10))
    })

    it("should return 404 for non-existent image", async () => {
      const response = await request(api)
        .put("/images/550e8400-e29b-41d4-a716-446655440000/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ camera: "Test Camera" })
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api)
        .put(`/images/${image.id}/metadata`)
        .send({ camera: "Test Camera" })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("DELETE /images/:id", () => {
    let image

    beforeEach(async () => {
      image = await createImage()
    })

    it("should delete image successfully", async () => {
      const response = await request(api)
        .delete(`/images/${image.id}`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()

      const fetchResponse = await request(api).get(`/images/${image.id}`).expect(404)
      expect(fetchResponse.body.status).toBe("fail")
    })

    it("should return 404 for non-existent image", async () => {
      const response = await request(api)
        .delete("/images/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api).delete(`/images/${image.id}`).expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("POST /maintenance/cleanup-temp", () => {
    it("should cleanup temp files successfully", async () => {
      const response = await request(api)
        .post("/maintenance/cleanup-temp")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.result).toHaveProperty("deleted")
      expect(response.body.data.result).toHaveProperty("scanned")
      expect(response.body.data.result).toHaveProperty("errors")
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api).post("/maintenance/cleanup-temp").expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("POST /maintenance/cleanup-orphaned", () => {
    it("should cleanup orphaned files successfully", async () => {
      const response = await request(api)
        .post("/maintenance/cleanup-orphaned")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.result).toHaveProperty("deleted")
      expect(response.body.data.result).toHaveProperty("scanned")
      expect(response.body.data.result).toHaveProperty("errors")
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api).post("/maintenance/cleanup-orphaned").expect(401)

      expect(response.body.status).toBe("fail")
    })
  })
})
