import { createAccessToken, createAdminUser } from "#tests/helpers/authHelpers.js"
import {
  createImageWithFile,
  createImageWithVersions,
  createMockFile
} from "#tests/helpers/imageHelpers.js"
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
      await Promise.all([
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions()
      ])

      const response = await request(api).get("/images").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })

    it("should get images with limit", async () => {
      await Promise.all([
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions()
      ])

      const response = await request(api).get("/images?limit=2").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(2)
    })

    it("should get images with offset", async () => {
      await Promise.all([
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions()
      ])

      const response = await request(api).get("/images?offset=2").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })

    it("should not expose originalFilename in the response", async () => {
      await createImageWithVersions()

      const response = await request(api).get("/images").expect(200)

      expect(response.body.data.images[0].originalFilename).toBeUndefined()
    })
  })

  describe("GET /tiny-images", () => {
    it("should get tiny images successfully", async () => {
      await Promise.all([createImageWithVersions(), createImageWithVersions()])

      const response = await request(api).get("/tiny-images").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
    })
  })

  describe("GET /images/:id", () => {
    it("should get image by id successfully", async () => {
      const image = await createImageWithVersions()

      const response = await request(api).get(`/images/${image.id}`).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.image.id).toBe(image.id)
      expect(response.body.data.image.aperture).toBe(image.aperture)
      expect(response.body.data.image.camera).toBe(image.camera)
      expect(Array.isArray(response.body.data.image.versions)).toBe(true)
      expect(response.body.data.image.versions.length).toBeGreaterThan(0)
    })

    it("should not expose originalFilename in the response", async () => {
      const image = await createImageWithVersions()

      const response = await request(api).get(`/images/${image.id}`).expect(200)

      expect(response.body.data.image.originalFilename).toBeUndefined()
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
        focalLengthEquivalent: "80mm",
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
      image = await createImageWithVersions()
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
      image = await createImageWithVersions()
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

  describe("DELETE /images (bulk delete)", () => {
    it("should delete multiple images", async () => {
      const images = await Promise.all([
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions()
      ])
      const ids = images.map((i) => i.id)

      const response = await request(api)
        .delete("/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()

      for (const id of ids) {
        await request(api).get(`/images/${id}`).expect(404)
      }
    })

    it("should delete a single image via bulk endpoint", async () => {
      const image = await createImageWithVersions()

      await request(api)
        .delete("/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image.id] })
        .expect(200)

      await request(api).get(`/images/${image.id}`).expect(404)
    })

    it("should not affect images not in the ids list", async () => {
      const toDelete = await createImageWithVersions()
      const toKeep = await createImageWithVersions()

      await request(api)
        .delete("/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [toDelete.id] })
        .expect(200)

      const fetchResponse = await request(api).get(`/images/${toKeep.id}`).expect(200)
      expect(fetchResponse.body.data.image.id).toBe(toKeep.id)
    })

    it("should return 400 when ids array is empty", async () => {
      const response = await request(api)
        .delete("/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [] })
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 400 when ids field is missing", async () => {
      const response = await request(api)
        .delete("/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .delete("/images")
        .send({ ids: [image.id] })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("PUT /images/metadata (bulk update)", () => {
    it("should update metadata for multiple images", async () => {
      const images = await Promise.all([
        createImageWithVersions(),
        createImageWithVersions(),
        createImageWithVersions()
      ])
      const ids = images.map((i) => i.id)

      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids, metadata: { camera: "Bulk Camera", iso: "1600" } })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images).toHaveLength(3)
      response.body.data.images.forEach((img) => {
        expect(img.camera).toBe("Bulk Camera")
        expect(img.iso).toBe(1600)
      })
    })

    it("should only update provided fields leaving others unchanged", async () => {
      const image = await createImageWithVersions({
        camera: "Original Camera",
        lens: "Original Lens"
      })
      const id = image.id

      await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [id], metadata: { camera: "New Camera" } })
        .expect(200)

      const fetchResponse = await request(api).get(`/images/${id}`).expect(200)
      expect(fetchResponse.body.data.image.camera).toBe("New Camera")
      expect(fetchResponse.body.data.image.lens).toBe("Original Lens")
    })

    it("should parse iso string to integer", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image.id], metadata: { iso: "3200" } })
        .expect(200)

      expect(response.body.data.images[0].iso).toBe(3200)
    })

    it("should set fields to null when passed as null", async () => {
      const image = await createImageWithVersions({ camera: "Some Camera", lens: "Some Lens" })

      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image.id], metadata: { camera: null, lens: null } })
        .expect(200)

      expect(response.body.data.images[0].camera).toBeNull()
      expect(response.body.data.images[0].lens).toBeNull()
    })

    it("should return empty array when no metadata fields are provided", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image.id], metadata: {} })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.images).toEqual([])
    })

    it("should return 400 when ids array is empty", async () => {
      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [], metadata: { camera: "Test" } })
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 400 when ids field is missing", async () => {
      const response = await request(api)
        .put("/images/metadata")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ metadata: { camera: "Test" } })
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .put("/images/metadata")
        .send({ ids: [image.id], metadata: { camera: "Test" } })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("GET /images/:id/download", () => {
    it("should download an image file with correct headers", async () => {
      const image = await createImageWithFile()

      const response = await request(api)
        .get(`/images/${image.id}/download`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toMatch(/image\//)
      expect(response.headers["content-disposition"]).toMatch(/attachment/)
      expect(response.headers["content-disposition"]).toContain(image.originalFilename)
      expect(response.body).toBeTruthy()
    })

    it("should use originalFilename in Content-Disposition when available", async () => {
      const image = await createImageWithFile({ originalFilename: "my-photo.jpg" })

      const response = await request(api)
        .get(`/images/${image.id}/download`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.headers["content-disposition"]).toContain("my-photo.jpg")
    })

    it("should return 404 for non-existent image", async () => {
      const response = await request(api)
        .get("/images/550e8400-e29b-41d4-a716-446655440000/download")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const image = await createImageWithVersions()

      const response = await request(api).get(`/images/${image.id}/download`).expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("POST /images/download (bulk download)", () => {
    it("should return a ZIP archive for multiple images", async () => {
      const [image1, image2] = await Promise.all([createImageWithFile(), createImageWithFile()])

      const response = await request(api)
        .post("/images/download")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image1.id, image2.id] })
        .buffer(true)
        .parse((res, callback) => {
          const chunks = []
          res.on("data", (chunk) => chunks.push(chunk))
          res.on("end", () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)

      expect(response.headers["content-type"]).toContain("application/zip")
      expect(response.headers["content-disposition"]).toMatch(/\.zip"$/)
      expect(response.body[0]).toBe(0x50) // ZIP magic bytes: PK
      expect(response.body[1]).toBe(0x4b)
    })

    it("should return a ZIP archive for a single image", async () => {
      const image = await createImageWithFile()

      const response = await request(api)
        .post("/images/download")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [image.id] })
        .buffer(true)
        .parse((res, callback) => {
          const chunks = []
          res.on("data", (chunk) => chunks.push(chunk))
          res.on("end", () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)

      expect(response.headers["content-type"]).toContain("application/zip")
      expect(response.body[0]).toBe(0x50)
      expect(response.body[1]).toBe(0x4b)
    })

    it("should return 400 when ids array is empty", async () => {
      const response = await request(api)
        .post("/images/download")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [] })
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 400 when ids field is missing", async () => {
      const response = await request(api)
        .post("/images/download")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .post("/images/download")
        .send({ ids: [image.id] })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })
})
