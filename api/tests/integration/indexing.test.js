import { jest } from "@jest/globals"
import { sql } from "drizzle-orm"
import fs from "fs/promises"
import request from "supertest"

import { searchConfig } from "#src/config/search.js"
import Image from "#src/models/Image.js"
import { idle, INDEX_LOCK, indexSearchEmbeddings, requestPass } from "#src/services/indexService.js"
import { createAccessToken, createAdminUser } from "#tests/helpers/authHelpers.js"
import { createDescription, descriptionsOf } from "#tests/helpers/descriptionHelpers.js"
import { startFakeAiServer, unitVector } from "#tests/helpers/fakeAiServer.js"
import { createImageWithFile, createMockFile, getStoredImage } from "#tests/helpers/imageHelpers.js"
import { getDb } from "#tests/testDatabase.js"
import { createTestServer } from "#tests/testServer.js"

const { model } = searchConfig

describe("Indexing", () => {
  let api
  let ai
  let adminToken

  const indexed = async (data = {}) => {
    const image = await createImageWithFile({
      searchEmbedding: unitVector(0),
      searchEmbeddingModel: model,
      ...data
    })
    await createDescription(image.id, "en", { text: "Existing EN" })
    await createDescription(image.id, "es", { source: "translated", text: "Existing ES" })
    return image
  }

  const pending = () => createImageWithFile()

  const waitFor = async (condition) => {
    while (!condition()) await new Promise((resolve) => setTimeout(resolve, 10))
  }

  beforeAll(async () => {
    api = createTestServer()
    ai = await startFakeAiServer()
  })

  afterAll(async () => {
    await ai.stop()
  })

  beforeEach(async () => {
    ai.reset()
    jest.spyOn(console, "error").mockImplementation(() => {})
    adminToken = createAccessToken(await createAdminUser())
  })

  describe("search embeddings", () => {
    it("embeds the thumbnail of pending images and records the model", async () => {
      const image = await pending()
      const thumbnail = image.versions.find((version) => version.type === "thumbnail")

      const result = await indexSearchEmbeddings()

      expect(result).toEqual({ errors: 0, scanned: 1, successful: 1 })
      const row = await getStoredImage(image.id)
      expect(row.searchEmbedding).toHaveLength(768)
      expect(row.searchEmbeddingModel).toBe(model)
      const [sent] = ai.requestsTo("/embed/image")
      expect(sent.content.equals(await fs.readFile(thumbnail.path))).toBe(true)
    })

    it("skips images embedded by the current model", async () => {
      await indexed()

      expect(await indexSearchEmbeddings()).toEqual({ errors: 0, scanned: 0, successful: 0 })
      expect(ai.requestsTo("/embed/image")).toHaveLength(0)
    })

    it("embeds again after a model change", async () => {
      const image = await indexed({ searchEmbeddingModel: "previous-model" })

      await indexSearchEmbeddings()

      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
    })

    it("embeds every image when forced", async () => {
      await indexed()

      expect(await indexSearchEmbeddings({ force: true })).toMatchObject({ successful: 1 })
    })

    it("stops at the first image and keeps it pending when the service fails", async () => {
      const images = [await pending(), await pending()]
      ai.mode = "failing"

      const result = await indexSearchEmbeddings()

      expect(result).toEqual({ errors: 1, scanned: 2, successful: 0 })
      expect(ai.requestsTo("/embed/image")).toHaveLength(1)
      for (const image of images) {
        expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()
      }
    })

    it("indexes on a later pass once the service recovers", async () => {
      const image = await pending()
      ai.mode = "failing"
      await indexSearchEmbeddings()

      ai.mode = "healthy"
      await indexSearchEmbeddings()

      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
    })

    it.each([true, "html"])("continues past an image the service rejects (%s)", async (reject) => {
      await pending()
      await pending()
      ai.rejectImages = reject

      const result = await indexSearchEmbeddings()

      expect(result).toEqual({ errors: 2, scanned: 2, successful: 0 })
      expect(ai.requestsTo("/embed/image")).toHaveLength(2)
    })

    it("does not store embeddings from an unexpected model", async () => {
      const image = await pending()
      ai.model = "another-model"

      const result = await indexSearchEmbeddings()

      expect(result).toMatchObject({ errors: 1, successful: 0 })
      expect((await getStoredImage(image.id)).searchEmbedding).toBeNull()
    })

    it("counts an image without a thumbnail file as an error", async () => {
      const image = await pending()
      await fs.unlink(image.versions.find((version) => version.type === "thumbnail").path)
      const other = await pending()

      const result = await indexSearchEmbeddings()

      expect(result).toEqual({ errors: 1, scanned: 2, successful: 1 })
      expect((await getStoredImage(other.id)).searchEmbeddingModel).toBe(model)
    })
  })

  describe("background pass", () => {
    it("indexes embeddings and descriptions", async () => {
      const image = await pending()

      requestPass()
      await idle()

      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "generated", text: "Description 1" },
        es: { source: "translated", text: "es: Description 1" }
      })
    })

    it("keeps embedding when descriptions fail", async () => {
      const image = await pending()
      ai.describeMode = "failing"

      requestPass()
      await idle()

      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
      expect(await descriptionsOf(image.id)).toEqual({})
    })

    it("runs when only a translation is pending", async () => {
      const image = await createImageWithFile({
        searchEmbedding: unitVector(0),
        searchEmbeddingModel: model
      })
      await createDescription(image.id, "en", { text: "A dog." })

      requestPass()
      await idle()

      expect((await descriptionsOf(image.id)).es.text).toBe("es: A dog.")
      expect(ai.requestsTo("/describe/image")).toHaveLength(0)
    })

    it("does nothing while the search model is not ready", async () => {
      const image = await pending()
      ai.searchReady = false

      requestPass()
      await idle()

      expect(ai.requests.map((request) => request.path)).toEqual(["/health"])
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()
    })

    it("does nothing while the service runs another search model", async () => {
      const image = await pending()
      ai.model = "other/model"

      requestPass()
      await idle()

      expect(ai.requests.map((request) => request.path)).toEqual(["/health"])
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()
    })

    it("logs an error in a pass and runs the next one", async () => {
      const image = await pending()
      const spy = jest
        .spyOn(Image, "hasPendingSearchEmbedding")
        .mockRejectedValueOnce(new Error("Database unavailable"))

      try {
        requestPass()
        await idle()
        requestPass()
        await idle()
      } finally {
        spy.mockRestore()
      }

      expect(console.error).toHaveBeenCalledWith("Indexing pass failed: Database unavailable")
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
    })

    it("makes no model request when nothing is pending", async () => {
      await indexed()

      requestPass()
      await idle()

      expect(ai.requests).toHaveLength(0)
    })

    it.each(["failing", "slow"])(
      "survives a %s service",
      async (mode) => {
        const image = await pending()
        ai.mode = mode

        requestPass()
        await idle()

        expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()
      },
      15000
    )

    it("survives a service that is down", async () => {
      const image = await pending()
      await ai.stop()

      requestPass()
      await idle()

      ai = await startFakeAiServer()
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()
    })

    it("runs again when requested during a pass", async () => {
      let open
      ai.gate = new Promise((resolve) => (open = resolve))
      const first = await pending()
      requestPass()
      await waitFor(() => ai.requestsTo("/embed/image").length === 1)

      const second = await pending()
      requestPass()
      open()
      await idle()

      expect((await getStoredImage(first.id)).searchEmbeddingModel).toBe(model)
      expect((await getStoredImage(second.id)).searchEmbeddingModel).toBe(model)
    })
  })

  describe("while another process is indexing", () => {
    // The test database connection stands in for the other process.
    const lock = () => getDb().execute(sql`SELECT pg_advisory_lock(hashtext(${INDEX_LOCK}))`)
    const unlock = () => getDb().execute(sql`SELECT pg_advisory_unlock(hashtext(${INDEX_LOCK}))`)
    let held

    beforeEach(async () => {
      await lock()
      held = true
    })

    const release = async () => {
      await unlock()
      held = false
    }

    afterEach(async () => {
      if (held) await release()
    })

    it("the background pass does nothing, then indexes once the other is done", async () => {
      const image = await pending()

      requestPass()
      await idle()
      expect(ai.requests).toHaveLength(0)
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBeNull()

      await release()
      requestPass()
      await idle()
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
    })

    it("a backfill waits for the other to finish", async () => {
      await pending()
      let finished = false

      const backfill = indexSearchEmbeddings().finally(() => (finished = true))
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(finished).toBe(false)
      expect(ai.requests).toHaveLength(0)

      await release()
      expect(await backfill).toEqual({ errors: 0, scanned: 1, successful: 1 })
    })
  })

  describe("the indexing lock", () => {
    it("is released after a failed backfill", async () => {
      await pending()
      ai.mode = "failing"
      await indexSearchEmbeddings()
      ai.mode = "healthy"

      expect(await indexSearchEmbeddings()).toEqual({ errors: 0, scanned: 1, successful: 1 })
    })

    it("lets a backfill run after a background pass in the same process", async () => {
      const image = await pending()

      requestPass()
      const result = await indexSearchEmbeddings()
      await idle()

      expect(result.errors).toBe(0)
      expect((await getStoredImage(image.id)).searchEmbeddingModel).toBe(model)
      expect(ai.requestsTo("/embed/image")).toHaveLength(1)
    })
  })

  describe("after an upload", () => {
    const upload = async () => {
      const review = await request(api)
        .post("/upload/review")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("images", createMockFile("test.png").buffer, "test.png")
      const { sessionId } = review.body.data.images[0]

      return await request(api)
        .post("/upload/confirm")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ images: [{ metadata: {}, sessionId }] })
        .expect(201)
    }

    it("the image gets an embedding and descriptions", async () => {
      const response = await upload()
      await idle()

      const { descriptions, id } = response.body.data.images[0]
      expect(descriptions).toEqual({})
      expect((await getStoredImage(id)).searchEmbeddingModel).toBe(model)
      expect(Object.keys(await descriptionsOf(id)).sort()).toEqual(["en", "es"])
    })

    it("a failing service does not fail the upload or the process", async () => {
      ai.mode = "failing"

      const response = await upload()
      await idle()

      expect(
        (await getStoredImage(response.body.data.images[0].id)).searchEmbeddingModel
      ).toBeNull()
    })
  })

  describe("POST /tasks/backfill", () => {
    const backfill = async (path) => {
      const response = await request(api)
        .post(`/tasks/backfill/${path}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      return response.body.data.result
    }

    it("embeds pending images", async () => {
      await pending()
      await indexed()

      expect(await backfill("embeddings")).toEqual({ errors: 0, scanned: 1, successful: 1 })
    })

    it("embeds every image only when force is true", async () => {
      await indexed()

      expect(await backfill("embeddings?force=false")).toMatchObject({ scanned: 0 })
      expect(await backfill("embeddings?force=true")).toMatchObject({ scanned: 1 })
    })

    it("describes every image only when force is true", async () => {
      const image = await indexed()

      expect(await backfill("captions?force=false")).toMatchObject({ scanned: 0 })
      expect(await backfill("captions?force=true")).toEqual({
        errors: 0,
        scanned: 2,
        successful: 2
      })
      expect((await descriptionsOf(image.id)).en.text).toBe("Description 1")
    })

    it("requires authentication", async () => {
      await request(api).post("/tasks/backfill/embeddings").expect(401)
    })
  })
})
