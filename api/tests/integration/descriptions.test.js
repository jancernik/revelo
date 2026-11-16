import { jest } from "@jest/globals"
import request from "supertest"

import { descriptionConfig } from "#src/config/descriptions.js"
import Image from "#src/models/Image.js"
import * as descriptionService from "#src/services/descriptionService.js"
import { indexDescriptions, indexSearchEmbeddings } from "#src/services/indexService.js"
import { createCollection } from "#tests/helpers/collectionHelpers.js"
import { createDescription, descriptionsOf } from "#tests/helpers/descriptionHelpers.js"
import { DESCRIBE_MODEL, startFakeAiServer, unitVector } from "#tests/helpers/fakeAiServer.js"
import {
  createImageWithFile,
  createImageWithVersions,
  getStoredImage
} from "#tests/helpers/imageHelpers.js"
import { createTestServer } from "#tests/testServer.js"

const edited = { model: null, source: "edited", text: "Written by hand" }

describe("Descriptions", () => {
  let api
  let ai

  beforeAll(async () => {
    api = createTestServer()
    ai = await startFakeAiServer()
  })

  afterAll(async () => {
    await ai.stop()
  })

  beforeEach(() => {
    ai.reset()
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  describe("indexing", () => {
    it("describes the thumbnail and translates the result", async () => {
      const image = await createImageWithFile()

      const result = await indexDescriptions()

      expect(result).toEqual({ errors: 0, scanned: 2, successful: 2 })
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { model: DESCRIBE_MODEL, source: "generated", text: "Description 1" },
        es: { model: DESCRIBE_MODEL, source: "translated", text: "es: Description 1" }
      })
      expect(ai.requestsTo("/translate")[0].fields.target.toString()).toBe("es")
    })

    it("does nothing for images that are described and translated", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en")
      await createDescription(image.id, "es", { source: "translated" })

      expect(await indexDescriptions()).toEqual({ errors: 0, scanned: 0, successful: 0 })
      expect(ai.requests).toHaveLength(0)
    })

    it("translates an existing description that lacks a language", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "A dog." })

      await indexDescriptions()

      expect(ai.requestsTo("/describe/image")).toHaveLength(0)
      expect((await descriptionsOf(image.id)).es.text).toBe("es: A dog.")
    })

    it("translates into a language added to the configuration", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { source: "translated" })
      descriptionConfig.targetLanguages.push("de")

      try {
        await indexDescriptions()
      } finally {
        descriptionConfig.targetLanguages.pop()
      }

      expect((await descriptionsOf(image.id)).de.text).toBe("de: A dog.")
    })

    it("logs an unsupported language and continues", async () => {
      const first = await createImageWithFile()
      const second = await createImageWithFile()
      descriptionConfig.targetLanguages.unshift("xx")

      let result
      try {
        result = await indexDescriptions()
      } finally {
        descriptionConfig.targetLanguages.shift()
      }

      expect(result).toEqual({ errors: 2, scanned: 6, successful: 4 })
      expect((await descriptionsOf(first.id)).es).toBeDefined()
      expect((await descriptionsOf(second.id)).es).toBeDefined()
    })

    it("stops and keeps images pending when the service fails", async () => {
      const images = [await createImageWithFile(), await createImageWithFile()]
      ai.describeMode = "failing"

      const result = await indexDescriptions()

      expect(result).toEqual({ errors: 1, scanned: 2, successful: 0 })
      expect(ai.requestsTo("/describe/image")).toHaveLength(1)
      expect(await descriptionsOf(images[0].id)).toEqual({})
    })

    it("does not translate once the service is unavailable", async () => {
      await createImageWithFile()
      const described = await createImageWithFile()
      await createDescription(described.id, "en", { text: "A dog." })
      ai.describeMode = "failing"

      const result = await indexDescriptions()

      expect(result).toEqual({ errors: 1, scanned: 1, successful: 0 })
      expect(ai.requestsTo("/translate")).toHaveLength(0)
    })

    it("does not pause search embeddings after repeated translation failures", async () => {
      ai.describeMode = "failing"
      for (let i = 0; i < 6; i++) {
        const image = await createImageWithFile()
        await createDescription(image.id, "en")
        await indexDescriptions()
      }

      const result = await indexSearchEmbeddings()

      expect(ai.requestsTo("/translate")).toHaveLength(5)
      expect(result).toMatchObject({ errors: 0, successful: 6 })
    })

    it("does not pause search embeddings after repeated description failures", async () => {
      ai.describeMode = "failing"
      for (let i = 0; i < 6; i++) {
        await createImageWithFile()
        await indexDescriptions()
      }

      const result = await indexSearchEmbeddings()

      expect(result).toMatchObject({ errors: 0, successful: 6 })
    })

    it("never changes the search embedding", async () => {
      const embedded = { searchEmbedding: unitVector(0), searchEmbeddingModel: "previous-model" }
      const image = await createImageWithFile(embedded)

      await indexDescriptions({ force: true })

      expect(ai.requestsTo("/embed/image")).toHaveLength(0)
      expect(await getStoredImage(image.id)).toMatchObject(embedded)
    })
  })

  describe("edited descriptions", () => {
    it("survive a pass and a forced run", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", edited)
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      await indexDescriptions()
      await indexDescriptions({ force: true })

      expect(ai.requests).toHaveLength(0)
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "edited", text: "Written by hand" },
        es: { source: "edited", text: "Escrito a mano" }
      })
    })

    it("are not replaced by a generated text, and keep their translations", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", edited)
      await createDescription(image.id, "es", { source: "translated", text: "Escrito a mano" })

      const written = await descriptionService.saveGenerated(image.id, {
        model: DESCRIBE_MODEL,
        text: "Generated"
      })

      expect(written).toBe(false)
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "edited", text: "Written by hand" },
        es: { source: "translated", text: "Escrito a mano" }
      })
    })

    it("are not replaced by a translation", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      const written = await descriptionService.saveTranslated(image.id, "es", {
        model: DESCRIBE_MODEL,
        sourceText: "A dog.",
        text: "Traducido"
      })

      expect(written).toBe(false)
      expect((await descriptionsOf(image.id)).es).toMatchObject({
        source: "edited",
        text: "Escrito a mano"
      })
    })

    it("in the source language are translated as written", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", edited)

      await indexDescriptions()

      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "edited", text: "Written by hand" },
        es: { source: "translated", text: "es: Written by hand" }
      })
    })

    it("in a target language are kept when the source is generated again", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "Old" })
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      await indexDescriptions({ force: true })

      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "generated", text: "Description 1" },
        es: { source: "edited", text: "Escrito a mano" }
      })
    })
  })

  describe("forced run", () => {
    it("generates again and translates the new text", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "Old" })
      await createDescription(image.id, "es", { source: "translated", text: "Viejo" })

      const result = await indexDescriptions({ force: true })

      expect(result).toEqual({ errors: 0, scanned: 2, successful: 2 })
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { text: "Description 1" },
        es: { source: "translated", text: "es: Description 1" }
      })
    })

    it("keeps the existing descriptions when the service fails", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "Old" })
      await createDescription(image.id, "es", { source: "translated", text: "Viejo" })
      ai.describeMode = "failing"

      await indexDescriptions({ force: true })

      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { text: "Old" },
        es: { text: "Viejo" }
      })
    })
  })

  describe("translations", () => {
    it("are not stored when the source text changed meanwhile", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", { text: "A cat." })

      const written = await descriptionService.saveTranslated(image.id, "es", {
        model: DESCRIBE_MODEL,
        sourceText: "A dog.",
        text: "Un perro."
      })

      expect(written).toBe(false)
      expect((await descriptionsOf(image.id)).es).toBeUndefined()
    })
  })

  describe("in API responses", () => {
    it("are a map of language to text on images", async () => {
      const image = await createImageWithVersions()
      const bare = await createImageWithVersions()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { source: "translated", text: "Un perro." })

      const list = await request(api).get("/images").expect(200)
      const single = await request(api).get(`/images/${image.id}`).expect(200)

      const byId = Object.fromEntries(list.body.data.images.map((item) => [item.id, item]))
      expect(byId[image.id].descriptions).toEqual({ en: "A dog.", es: "Un perro." })
      expect(byId[bare.id].descriptions).toEqual({})
      expect(single.body.data.image.descriptions).toEqual({ en: "A dog.", es: "Un perro." })
    })

    it("are included on the images of a collection", async () => {
      const collection = await createCollection()
      const image = await createImageWithVersions({
        collectionId: collection.id,
        collectionOrder: 0
      })
      await createDescription(image.id, "en", { text: "A dog." })

      const response = await request(api).get(`/collections/${collection.id}`).expect(200)

      expect(response.body.data.collection.images[0].descriptions).toEqual({ en: "A dog." })
    })

    it("are deleted with the image", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en")

      await Image.delete(image.id)

      expect(await descriptionsOf(image.id)).toEqual({})
    })
  })
})
