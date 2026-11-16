import { jest } from "@jest/globals"
import request from "supertest"

import { descriptionConfig } from "#src/config/descriptions.js"
import Image from "#src/models/Image.js"
import * as descriptionService from "#src/services/descriptionService.js"
import { idle, indexDescriptions, indexSearchEmbeddings } from "#src/services/indexService.js"
import {
  createAccessToken,
  createAdminUser,
  createRegularUser
} from "#tests/helpers/authHelpers.js"
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

  describe("editing", () => {
    let token

    beforeEach(async () => {
      token = createAccessToken(await createAdminUser())
    })

    const authed = (method, path) =>
      request(api)[method](path).set("Authorization", `Bearer ${token}`)
    const summary = (response) =>
      response.body.data.descriptions.map(({ language, source, text }) => [language, source, text])

    it("GET lists every configured language, with null for a missing one", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { source: "translated", text: "Un perro." })
      await createDescription(image.id, "fr", { source: "translated", text: "Un chien." })
      const bare = await createImageWithVersions()

      const described = await authed("get", `/images/${image.id}/descriptions`).expect(200)
      const pending = await authed("get", `/images/${bare.id}/descriptions`).expect(200)

      expect(summary(described)).toEqual([
        ["en", "generated", "A dog."],
        ["es", "translated", "Un perro."]
      ])
      expect(summary(pending)).toEqual([
        ["en", null, null],
        ["es", null, null]
      ])
    })

    it("PUT in the source language stores the text and translates it again", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { source: "translated", text: "Un perro." })

      const response = await authed("put", `/images/${image.id}/descriptions/en`)
        .send({ text: "  A black dog on a beach.  " })
        .expect(200)
      await idle()

      expect(summary(response)).toEqual([
        ["en", "edited", "A black dog on a beach."],
        ["es", null, null]
      ])
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { model: null, source: "edited", text: "A black dog on a beach." },
        es: { source: "translated", text: "es: A black dog on a beach." }
      })
      expect(ai.requestsTo("/describe/image")).toHaveLength(0)
    })

    it("PUT in the source language keeps an edited translation", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "A dog." })
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      await authed("put", `/images/${image.id}/descriptions/en`)
        .send({ text: "A cat." })
        .expect(200)
      await idle()

      expect((await descriptionsOf(image.id)).es).toMatchObject({
        source: "edited",
        text: "Escrito a mano"
      })
      expect(ai.requestsTo("/translate")).toHaveLength(0)
    })

    it("PUT in a target language leaves the source alone", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { text: "A dog." })

      await authed("put", `/images/${image.id}/descriptions/es`)
        .send({ text: "Un perro negro." })
        .expect(200)
      await idle()

      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "generated", text: "A dog." },
        es: { model: null, source: "edited", text: "Un perro negro." }
      })
      expect(ai.requestsTo("/translate")).toHaveLength(0)
    })

    it("an edit is shown on the image", async () => {
      const image = await createImageWithVersions()

      await authed("put", `/images/${image.id}/descriptions/es`).send({ text: "Un perro." })
      const single = await request(api).get(`/images/${image.id}`).expect(200)

      expect(single.body.data.image.descriptions.es).toBe("Un perro.")
    })

    it.each([
      ["a blank text", "en", { text: "   " }],
      ["a missing text", "en", {}],
      ["a text over the limit", "en", { text: "a".repeat(descriptionConfig.maxLength + 1) }],
      ["a language that is not configured", "fr", { text: "Un chien." }]
    ])("PUT rejects %s", async (_, language, body) => {
      const image = await createImageWithVersions()

      await authed("put", `/images/${image.id}/descriptions/${language}`).send(body).expect(400)

      expect(await descriptionsOf(image.id)).toEqual({})
    })

    it("regenerate discards an edit and describes the image again", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { ...edited, text: "Written by hand" })
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      const response = await authed("post", `/images/${image.id}/descriptions/regenerate`).expect(
        200
      )
      await idle()

      expect(summary(response)).toEqual([
        ["en", null, null],
        ["es", null, null]
      ])
      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "generated", text: "Description 1" },
        es: { source: "translated", text: "es: Description 1" }
      })
    })

    it("regenerate of one language keeps the others", async () => {
      const image = await createImageWithFile()
      await createDescription(image.id, "en", { ...edited, text: "Written by hand" })
      await createDescription(image.id, "es", { ...edited, text: "Escrito a mano" })

      await authed("post", `/images/${image.id}/descriptions/regenerate`)
        .send({ languages: ["es"] })
        .expect(200)
      await idle()

      expect(await descriptionsOf(image.id)).toMatchObject({
        en: { source: "edited", text: "Written by hand" },
        es: { source: "translated", text: "es: Written by hand" }
      })
      expect(ai.requestsTo("/describe/image")).toHaveLength(0)
    })

    it("regenerate rejects a language that is not configured", async () => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", { ...edited, text: "Written by hand" })

      await authed("post", `/images/${image.id}/descriptions/regenerate`)
        .send({ languages: ["fr"] })
        .expect(400)

      expect((await descriptionsOf(image.id)).en.text).toBe("Written by hand")
    })

    it("only affects the image it is called for", async () => {
      const image = await createImageWithVersions()
      const other = await createImageWithVersions()
      await createDescription(other.id, "en", { text: "A dog." })
      await createDescription(other.id, "es", { source: "translated", text: "Un perro." })
      ai.describeMode = "failing"

      await authed("put", `/images/${image.id}/descriptions/en`).send({ text: "A cat." })
      await authed("post", `/images/${image.id}/descriptions/regenerate`)
      await idle()

      expect(await descriptionsOf(other.id)).toMatchObject({
        en: { text: "A dog." },
        es: { text: "Un perro." }
      })
    })

    it.each([
      ["get", "/descriptions"],
      ["put", "/descriptions/en"],
      ["post", "/descriptions/regenerate"]
    ])("%s %s needs an admin and an existing image", async (method, path) => {
      const image = await createImageWithVersions()
      await createDescription(image.id, "en", { text: "A dog." })
      const userToken = createAccessToken(await createRegularUser())
      const send = (id, bearer) => {
        const call = request(api)[method](`/images/${id}${path}`).send({ text: "A cat." })
        return bearer ? call.set("Authorization", `Bearer ${bearer}`) : call
      }

      await send(image.id).expect(401)
      await send(image.id, userToken).expect(401)
      await send("00000000-0000-4000-8000-000000000000", token).expect(404)

      expect((await descriptionsOf(image.id)).en.text).toBe("A dog.")
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
