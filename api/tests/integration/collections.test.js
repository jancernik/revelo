import { createAccessToken, createAdminUser } from "#tests/helpers/authHelpers.js"
import {
  createCollection,
  createCollections,
  createCollectionWithImages
} from "#tests/helpers/collectionHelpers.js"
import { createImageWithVersions } from "#tests/helpers/imageHelpers.js"
import { createTestServer } from "#tests/testServer.js"
import request from "supertest"

const api = createTestServer()

describe("Collection Endpoints", () => {
  let adminUserToken

  beforeAll(async () => {
    const adminUser = await createAdminUser()
    adminUserToken = createAccessToken(adminUser)
  })

  describe("GET /collections", () => {
    it("should return all collections", async () => {
      await createCollections(3)

      const response = await request(api).get("/collections").expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.collections)).toBe(true)
      expect(response.body.data.collections.length).toBe(3)
    })

    it("should return empty array when no collections exist", async () => {
      const response = await request(api).get("/collections").expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collections).toEqual([])
    })

    it("should return collections with their images", async () => {
      await createCollectionWithImages(2)

      const response = await request(api).get("/collections").expect(200)

      expect(response.body.status).toBe("success")
      const collection = response.body.data.collections[0]
      expect(Array.isArray(collection.images)).toBe(true)
      expect(collection.images.length).toBe(2)
    })

    it("should return collections with limit", async () => {
      await createCollections(5)

      const response = await request(api).get("/collections?limit=2").expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collections.length).toBe(2)
    })

    it("should return collections with offset", async () => {
      await createCollections(5)

      const response = await request(api).get("/collections?offset=3").expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collections.length).toBe(2)
    })
  })

  describe("GET /collections/:id", () => {
    it("should return a collection by id", async () => {
      const collection = await createCollection({ description: "My desc", title: "My Collection" })

      const response = await request(api).get(`/collections/${collection.id}`).expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.id).toBe(collection.id)
      expect(response.body.data.collection.title).toBe("My Collection")
      expect(response.body.data.collection.description).toBe("My desc")
    })

    it("should return collection with its images", async () => {
      const { id } = await createCollectionWithImages(3)

      const response = await request(api).get(`/collections/${id}`).expect(200)

      expect(response.body.status).toBe("success")
      expect(Array.isArray(response.body.data.collection.images)).toBe(true)
      expect(response.body.data.collection.images.length).toBe(3)
    })

    it("should return 404 for non-existent collection", async () => {
      const response = await request(api)
        .get("/collections/550e8400-e29b-41d4-a716-446655440000")
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })
  })

  describe("POST /collections", () => {
    it("should create a collection with title and description", async () => {
      const response = await request(api)
        .post("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ description: "A description", title: "New Collection" })
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.title).toBe("New Collection")
      expect(response.body.data.collection.description).toBe("A description")
      expect(response.body.data.collection.id).toBeDefined()
    })

    it("should create a collection with only a title", async () => {
      const response = await request(api)
        .post("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ title: "Minimal Collection" })
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.title).toBe("Minimal Collection")
    })

    it("should create a collection with no fields", async () => {
      const response = await request(api)
        .post("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.id).toBeDefined()
    })

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(api)
        .post("/collections")
        .send({ title: "Unauthorized" })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("PUT /collections/:id", () => {
    it("should update collection title and description", async () => {
      const collection = await createCollection({ description: "Old desc", title: "Old Title" })

      const response = await request(api)
        .put(`/collections/${collection.id}`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ description: "New desc", title: "New Title" })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.title).toBe("New Title")
      expect(response.body.data.collection.description).toBe("New desc")
    })

    it("should update only the title", async () => {
      const collection = await createCollection({ description: "Keep this" })

      const response = await request(api)
        .put(`/collections/${collection.id}`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ title: "Updated Title" })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.title).toBe("Updated Title")
    })

    it("should return 404 for non-existent collection", async () => {
      const response = await request(api)
        .put("/collections/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ title: "Updated" })
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unauthenticated request", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .put(`/collections/${collection.id}`)
        .send({ title: "Unauthorized" })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("DELETE /collections/:id", () => {
    it("should delete a collection", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .delete(`/collections/${collection.id}`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()

      const fetchResponse = await request(api).get(`/collections/${collection.id}`).expect(404)

      expect(fetchResponse.body.status).toBe("fail")
    })

    it("should nullify collectionId on images when collection is deleted", async () => {
      const { id: collectionId, images } = await createCollectionWithImages(2)

      await request(api)
        .delete(`/collections/${collectionId}`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      for (const image of images) {
        const imageResponse = await request(api).get(`/images/${image.id}`).expect(200)
        expect(imageResponse.body.data.image.collectionId).toBeNull()
      }
    })

    it("should return 404 for non-existent collection", async () => {
      const response = await request(api)
        .delete("/collections/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 401 for unauthenticated request", async () => {
      const collection = await createCollection()

      const response = await request(api).delete(`/collections/${collection.id}`).expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("DELETE /collections (bulk delete)", () => {
    it("should delete multiple collections", async () => {
      const collections = await createCollections(3)
      const ids = collections.map((c) => c.id)

      const response = await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data).toBeNull()

      for (const id of ids) {
        const fetchResponse = await request(api).get(`/collections/${id}`).expect(404)
        expect(fetchResponse.body.status).toBe("fail")
      }
    })

    it("should delete a single collection via bulk endpoint", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [collection.id] })
        .expect(200)

      expect(response.body.status).toBe("success")

      await request(api).get(`/collections/${collection.id}`).expect(404)
    })

    it("should nullify collectionId on images of all deleted collections", async () => {
      const collectionA = await createCollectionWithImages(2)
      const collectionB = await createCollectionWithImages(2)
      const allImages = [...collectionA.images, ...collectionB.images]

      await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [collectionA.id, collectionB.id] })
        .expect(200)

      for (const image of allImages) {
        const imageResponse = await request(api).get(`/images/${image.id}`).expect(200)
        expect(imageResponse.body.data.image.collectionId).toBeNull()
      }
    })

    it("should not affect collections not in the ids list", async () => {
      const [toDelete, toKeep] = await createCollections(2)

      await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [toDelete.id] })
        .expect(200)

      const fetchResponse = await request(api).get(`/collections/${toKeep.id}`).expect(200)
      expect(fetchResponse.body.data.collection.id).toBe(toKeep.id)
    })

    it("should return 400 when ids array is empty", async () => {
      const response = await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ ids: [] })
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 400 when ids field is missing", async () => {
      const response = await request(api)
        .delete("/collections")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .delete("/collections")
        .send({ ids: [collection.id] })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("PUT /collections/:id/images", () => {
    it("should set images for a collection", async () => {
      const collection = await createCollection()
      const image1 = await createImageWithVersions()
      const image2 = await createImageWithVersions()

      const response = await request(api)
        .put(`/collections/${collection.id}/images`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ imageIds: [image1.id, image2.id] })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.images.length).toBe(2)
    })

    it("should replace existing images with new set", async () => {
      const { id: collectionId } = await createCollectionWithImages(2)
      const newImage = await createImageWithVersions()

      const response = await request(api)
        .put(`/collections/${collectionId}/images`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ imageIds: [newImage.id] })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.images.length).toBe(1)
      expect(response.body.data.collection.images[0].id).toBe(newImage.id)
    })

    it("should remove all images when empty array is sent", async () => {
      const { id: collectionId } = await createCollectionWithImages(2)

      const response = await request(api)
        .put(`/collections/${collectionId}/images`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ imageIds: [] })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.collection.images.length).toBe(0)
    })

    it("should return 404 for non-existent collection", async () => {
      const image = await createImageWithVersions()

      const response = await request(api)
        .put("/collections/550e8400-e29b-41d4-a716-446655440000/images")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({ imageIds: [image.id] })
        .expect(404)

      expect(response.body.status).toBe("fail")
      expect(response.body.data).toBeNull()
    })

    it("should return 400 when imageIds is missing", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .put(`/collections/${collection.id}/images`)
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for unauthenticated request", async () => {
      const collection = await createCollection()

      const response = await request(api)
        .put(`/collections/${collection.id}/images`)
        .send({ imageIds: [] })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })
  })
})
