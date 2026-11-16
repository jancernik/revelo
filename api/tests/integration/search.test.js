import { jest } from "@jest/globals"
import request from "supertest"

import { searchConfig } from "#src/config/search.js"
import { selectRelevant } from "#src/services/searchService.js"
import { createAccessToken, createAdminUser } from "#tests/helpers/authHelpers.js"
import { degreesForSimilarity, startFakeAiServer, unitVector } from "#tests/helpers/fakeAiServer.js"
import { createImageWithVersions } from "#tests/helpers/imageHelpers.js"
import { createTestServer } from "#tests/testServer.js"

const { floor, margin, model } = searchConfig

describe("selectRelevant", () => {
  const scored = (...similarities) => similarities.map((similarity, id) => ({ id, similarity }))

  it("keeps results within the margin of the best one", () => {
    const kept = selectRelevant(scored(0.3, 0.27, 0.26, 0.1), { floor: 0.06, margin: 0.035 })

    expect(kept.map((row) => row.id)).toEqual([0, 1])
  })

  it("applies the floor to every result", () => {
    expect(selectRelevant(scored(0.08, 0.05), { floor: 0.06, margin: 0.035 })).toHaveLength(1)
    expect(selectRelevant(scored(0.059, 0.05), { floor: 0.06, margin: 0.035 })).toEqual([])
  })

  it("keeps results exactly at the threshold", () => {
    expect(selectRelevant(scored(0.5, 0.25), { floor: 0.1, margin: 0.25 })).toHaveLength(2)
    expect(selectRelevant(scored(0.25), { floor: 0.25, margin: 0.1 })).toHaveLength(1)
  })

  it("returns nothing for no candidates", () => {
    expect(selectRelevant([], { floor: 0.06, margin: 0.035 })).toEqual([])
  })
})

describe("GET /images/search", () => {
  let api
  let ai
  let adminToken

  // The query "dog" embeds to 0 degrees, so an image at `similarity` scores exactly that.
  const imageAt = (similarity, data = {}) =>
    createImageWithVersions({
      camera: null,
      comment: null,
      lens: null,
      searchEmbedding: unitVector(degreesForSimilarity(similarity)),
      searchEmbeddingModel: model,
      ...data
    })

  const search = async (text, { query = {}, token } = {}) => {
    const call = request(api)
      .get("/images/search")
      .query({ text, ...query })
    if (token) call.set("Authorization", `Bearer ${token}`)
    const response = await call.expect(200)
    return response.body.data
  }

  const ids = (data) => data.images.map((image) => image.id)

  beforeAll(async () => {
    api = createTestServer()
    ai = await startFakeAiServer()
  })

  afterAll(async () => {
    await ai.stop()
  })

  beforeEach(async () => {
    ai.reset()
    ai.textEmbeddings.set("dog", unitVector(0))
    adminToken = createAccessToken(await createAdminUser())
  })

  it("orders results by similarity and cuts off below the margin", async () => {
    const second = await imageAt(0.3 - margin + 0.005)
    const best = await imageAt(0.3)
    await imageAt(0.3 - margin - 0.005)

    const data = await search("dog")

    expect(ids(data)).toEqual([best.id, second.id])
    expect(data.metadata.semantic).toBe(true)
  })

  it("returns nothing when the best match is below the floor", async () => {
    await imageAt(floor - 0.01)

    const data = await search("dog")

    expect(data.images).toEqual([])
    expect(data.metadata.semantic).toBe(true)
  })

  it("sends the query as typed to the AI service", async () => {
    await search("  Perro Grande ")

    expect(ai.requestsTo("/embed/text")[0].content.toString()).toBe("Perro Grande")
  })

  it("ignores images embedded by another model or not embedded", async () => {
    const current = await imageAt(0.3)
    await imageAt(0.3, { searchEmbeddingModel: "another-model" })
    await imageAt(0.3, { searchEmbedding: null, searchEmbeddingModel: null })

    expect(ids(await search("dog"))).toEqual([current.id])
  })

  it("respects the limit", async () => {
    await Promise.all([imageAt(0.3), imageAt(0.3), imageAt(0.3)])

    expect((await search("dog", { query: { limit: 2 } })).images).toHaveLength(2)
  })

  it("returns at most 50 results without a limit", async () => {
    await Promise.all(Array.from({ length: 51 }, () => imageAt(0.3)))

    expect((await search("dog")).images).toHaveLength(50)
  })

  it("returns images in the public shape without scores or embeddings", async () => {
    await imageAt(0.3)

    const [image] = (await search("dog")).images

    expect(image.versions).toHaveLength(4)
    expect(image).not.toHaveProperty("scoreBreakdown")
    expect(image).not.toHaveProperty("similarity")
    expect(image).not.toHaveProperty("searchEmbedding")
    expect(image).not.toHaveProperty("embedding")
  })

  describe("hidden images", () => {
    let visible

    beforeEach(async () => {
      visible = await imageAt(0.3)
      await imageAt(0.3, { camera: "dog", hidden: true })
    })

    it("are excluded for anonymous requests", async () => {
      expect(ids(await search("dog", { query: { includeHidden: true } }))).toEqual([visible.id])
    })

    it("are included for an admin on request", async () => {
      const data = await search("dog", { query: { includeHidden: true }, token: adminToken })

      expect(data.images).toHaveLength(2)
    })

    it("are excluded for an admin when includeHidden is false or omitted", async () => {
      const explicit = await search("dog", { query: { includeHidden: false }, token: adminToken })
      const omitted = await search("dog", { token: adminToken })

      expect(ids(explicit)).toEqual([visible.id])
      expect(ids(omitted)).toEqual([visible.id])
    })
  })

  describe("metadata matches", () => {
    it("come first even with a low similarity", async () => {
      const semantic = await imageAt(0.3)
      const byCamera = await imageAt(0.01, { camera: "SONY ILCE-6400" })
      const byLens = await imageAt(0.02, { lens: "Sony E 35mm F1.8" })
      const byComment = await imageAt(0.03, { comment: "Shot on my old sony." })
      ai.textEmbeddings.set("sony", unitVector(0))

      expect(ids(await search("sony"))).toEqual([byComment.id, byLens.id, byCamera.id, semantic.id])
    })

    it("match whole words only", async () => {
      await imageAt(0.01, { camera: "Samsung Galaxy" })
      await imageAt(0.01, { comment: "Sunset" })
      await imageAt(0.01, { lens: "Parasun" })
      const exact = await imageAt(0.01, { comment: "Morning sun" })
      ai.textEmbeddings.set("sun", unitVector(0))

      expect(ids(await search("sun"))).toEqual([exact.id])
    })

    it("match text with regex characters literally", async () => {
      const lens = await imageAt(0.01, {
        lens: "FE 50mm F1.8 (II)",
        searchEmbedding: null,
        searchEmbeddingModel: null
      })

      expect(ids(await search("F1.8 (II)"))).toEqual([lens.id])
      expect(ids(await search("F1x8"))).toEqual([])
      expect(ids(await search(".*"))).toEqual([])
    })

    it("match a part separated by punctuation", async () => {
      const camera = await imageAt(0.01, { camera: "SONY ILCE-6400" })

      expect(ids(await search("6400"))).toEqual([camera.id])
    })

    it("are searched for a two character query", async () => {
      const camera = await imageAt(0.01, {
        camera: "Sony A7",
        searchEmbedding: null,
        searchEmbeddingModel: null
      })

      expect(ids(await search("a7"))).toEqual([camera.id])
    })

    it("are not searched for a one character query", async () => {
      await imageAt(0.01, { comment: "a" })

      expect(ids(await search("a"))).toEqual([])
    })

    it("are listed once when they also match semantically", async () => {
      const both = await imageAt(0.3, { comment: "dog" })

      expect(ids(await search("dog"))).toEqual([both.id])
    })
  })

  describe("when the AI service cannot embed the query", () => {
    let byComment

    beforeEach(async () => {
      jest.spyOn(console, "error").mockImplementation(() => {})
      await imageAt(0.3)
      byComment = await imageAt(0.3, { comment: "My dog" })
    })

    const expectMetadataOnly = async () => {
      const data = await search("dog")

      expect(ids(data)).toEqual([byComment.id])
      expect(data.metadata.semantic).toBe(false)
    }

    it("returns metadata matches when the service fails", async () => {
      ai.mode = "failing"
      await expectMetadataOnly()
    })

    it("returns metadata matches when the service is down", async () => {
      await ai.stop()
      await expectMetadataOnly()
      ai = await startFakeAiServer()
    })

    it("returns metadata matches when the service uses another model", async () => {
      ai.model = "another-model"
      await expectMetadataOnly()
    })

    it("stops calling the service after repeated failures", async () => {
      ai.mode = "failing"
      for (let i = 0; i < 7; i++) await search("dog")

      expect(ai.requestsTo("/embed/text")).toHaveLength(5)
    })

    it("counts only consecutive failures", async () => {
      ai.mode = "failing"
      for (let i = 0; i < 4; i++) await search("dog")
      ai.mode = "healthy"
      await search("dog")
      ai.mode = "failing"
      for (let i = 0; i < 4; i++) await search("dog")

      expect(ai.requestsTo("/embed/text")).toHaveLength(9)
    })
  })

  it("rejects an empty query", async () => {
    await request(api).get("/images/search").query({ text: " " }).expect(400)
  })
})
