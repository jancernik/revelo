import { jest } from "@jest/globals"

import { searchConfig } from "#src/config/search.js"
import { createAiService } from "#src/services/aiService.js"

describe("AI service clients", () => {
  let fetchMock

  afterEach(() => {
    fetchMock?.mockRestore()
  })

  it("keeps a client's cooldown isolated when another client is created", async () => {
    const failing = createAiService()
    fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("{}", { status: 500 }))

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(failing.embedText("dog")).rejects.toMatchObject({
        data: { aiUnavailable: true }
      })
    }

    const healthy = createAiService()
    const result = { embedding: [1, 0], model: searchConfig.model }
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ data: result, status: "success" }))
    )

    await expect(healthy.embedText("dog")).resolves.toEqual(result)
    await expect(failing.embedText("dog")).rejects.toMatchObject({
      data: { aiUnavailable: true }
    })
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })
})
