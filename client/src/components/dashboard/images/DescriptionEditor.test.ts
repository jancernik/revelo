import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { DescriptionSource, ImageDescription } from "#src/types/models"

import DescriptionEditor from "#src/components/dashboard/images/DescriptionEditor.vue"
import { deferred } from "#src/stores/test/helpers"

type Request = () => Promise<ImageDescription[]>

const toast = vi.hoisted(() => vi.fn())
const store = vi.hoisted(() => ({
  fetchDescriptions: vi.fn<(id: string) => Promise<ImageDescription[]>>(),
  regenerateDescriptions:
    vi.fn<(id: string, languages?: string[]) => Promise<ImageDescription[]>>(),
  updateDescription:
    vi.fn<(id: string, language: string, text: string) => Promise<ImageDescription[]>>()
}))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/stores/images", () => ({ useImagesStore: () => store }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

const POLL = 4000

const written = (
  language: string,
  text: string,
  source: DescriptionSource = "generated"
): ImageDescription => ({ language, source, text, updatedAt: "2026-11-16T12:00:00.000Z" })
const pending = (language: string): ImageDescription => ({
  language,
  source: null,
  text: null,
  updatedAt: null
})

const settle = () => vi.advanceTimersByTimeAsync(0)

const render = async (list: ImageDescription[]) => {
  store.fetchDescriptions.mockResolvedValueOnce(list)
  const wrapper = mount(DescriptionEditor, {
    global: { stubs: { Icon: true } },
    props: { imageId: "img-1" }
  })
  await settle()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof render>>

const row = (wrapper: Wrapper, language: string) => wrapper.get(`[data-language="${language}"]`)
const text = (wrapper: Wrapper, language: string) => row(wrapper, language).get("textarea")
const button = (wrapper: Wrapper, language: string, label: "Regenerate" | "Save") => {
  const found = row(wrapper, language)
    .findAll("button")
    .find((item) => item.text() === label)
  if (!found) throw new Error(`Missing ${label} button for ${language}`)
  return found
}
const disabled = (wrapper: Wrapper, language: string, label: "Regenerate" | "Save") =>
  button(wrapper, language, label).element.disabled

describe("DescriptionEditor", () => {
  it("shows no rows until the descriptions load", async () => {
    const request = deferred<ImageDescription[]>()
    store.fetchDescriptions.mockReturnValueOnce(request.promise)
    const wrapper = mount(DescriptionEditor, {
      global: { stubs: { Icon: true } },
      props: { imageId: "img-1" }
    })
    await settle()
    expect(store.fetchDescriptions).toHaveBeenCalledExactlyOnceWith("img-1")
    expect(wrapper.get("h4").text()).toBe("Descriptions")
    expect(wrapper.findAll(".description")).toHaveLength(0)
    request.resolve([written("en", "A harbour")])
    await settle()
    expect(wrapper.findAll(".description")).toHaveLength(1)
  })

  it("lists every language with its name, origin and text", async () => {
    const wrapper = await render([
      written("en", "A harbour at dusk", "edited"),
      written("es", "Un puerto al anochecer", "translated")
    ])
    expect(wrapper.findAll(".language").map((item) => item.text())).toEqual(["English", "Spanish"])
    expect(wrapper.findAll(".status").map((item) => item.text())).toEqual(["Edited", "Translated"])
    expect(text(wrapper, "en").element.value).toBe("A harbour at dusk")
    expect(text(wrapper, "es").element.value).toBe("Un puerto al anochecer")
    expect(text(wrapper, "en").attributes()).toMatchObject({
      "aria-label": "English description",
      maxlength: "500",
      placeholder: ""
    })
  })

  it("keeps an empty editor when loading fails", async () => {
    store.fetchDescriptions.mockRejectedValueOnce(new Error("Network"))
    const wrapper = mount(DescriptionEditor, {
      global: { stubs: { Icon: true } },
      props: { imageId: "img-1" }
    })
    await settle()
    expect(wrapper.findAll(".description")).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(POLL * 3)
    expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
    expect(toast).not.toHaveBeenCalled()
  })

  describe("a language still being generated", () => {
    it("is marked pending, cannot be regenerated and can be written by hand", async () => {
      const wrapper = await render([written("en", "A harbour"), pending("es")])
      const status = row(wrapper, "es").get(".status")
      expect(status.text()).toBe("Pending")
      expect(status.classes()).toContain("pending")
      expect(row(wrapper, "en").get(".status").classes()).not.toContain("pending")
      expect(text(wrapper, "es").element.value).toBe("")
      expect(text(wrapper, "es").attributes("placeholder")).toBe(
        "Being generated. You can also write it."
      )
      expect(disabled(wrapper, "es", "Regenerate")).toBe(true)
      expect(disabled(wrapper, "en", "Regenerate")).toBe(false)
      expect(disabled(wrapper, "es", "Save")).toBe(true)
      await text(wrapper, "es").setValue("Un puerto")
      expect(disabled(wrapper, "es", "Save")).toBe(false)
    })

    it("is polled until every language has a text", async () => {
      const wrapper = await render([written("en", "A harbour"), pending("es")])
      store.fetchDescriptions
        .mockResolvedValueOnce([written("en", "A harbour"), pending("es")])
        .mockResolvedValueOnce([written("en", "A harbour"), written("es", "Un puerto")])
      await vi.advanceTimersByTimeAsync(POLL - 1)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(2)
      expect(row(wrapper, "es").get(".status").text()).toBe("Pending")
      await vi.advanceTimersByTimeAsync(POLL)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(3)
      expect(text(wrapper, "es").element.value).toBe("Un puerto")
      expect(row(wrapper, "es").get(".status").text()).toBe("Generated")
      await vi.advanceTimersByTimeAsync(POLL * 3)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(3)
    })

    it("stops being polled after a failed poll", async () => {
      await render([pending("en")])
      store.fetchDescriptions.mockRejectedValueOnce(new Error("Network"))
      await vi.advanceTimersByTimeAsync(POLL * 3)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(2)
    })

    it("keeps unsaved text while the other languages arrive", async () => {
      const wrapper = await render([pending("en"), pending("es")])
      await text(wrapper, "es").setValue("Mi texto")
      store.fetchDescriptions.mockResolvedValueOnce([
        written("en", "A harbour"),
        written("es", "Un puerto", "translated")
      ])
      await vi.advanceTimersByTimeAsync(POLL)
      expect(text(wrapper, "en").element.value).toBe("A harbour")
      expect(text(wrapper, "es").element.value).toBe("Mi texto")
      expect(row(wrapper, "es").get(".status").text()).toBe("Translated")
      expect(disabled(wrapper, "es", "Save")).toBe(false)
    })
  })

  it("does not poll when every language has a text", async () => {
    await render([written("en", "A harbour"), written("es", "Un puerto")])
    await vi.advanceTimersByTimeAsync(POLL * 3)
    expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
  })

  describe("saving", () => {
    it.each([
      { enabled: false, name: "the unchanged text", value: "A harbour" },
      { enabled: false, name: "surrounding whitespace only", value: "  A harbour \n" },
      { enabled: false, name: "an emptied text", value: "   " },
      { enabled: true, name: "a different text", value: "A harbour at dusk" }
    ])("is offered: $enabled for $name", async ({ enabled, value }) => {
      const wrapper = await render([written("en", "A harbour")])
      await text(wrapper, "en").setValue(value)
      expect(disabled(wrapper, "en", "Save")).toBe(!enabled)
    })

    it("sends the trimmed text and shows what the server stored", async () => {
      const wrapper = await render([written("en", "A harbour"), written("es", "Un puerto")])
      store.updateDescription.mockResolvedValueOnce([
        written("en", "A quiet harbour", "edited"),
        pending("es")
      ])
      await text(wrapper, "en").setValue("  A quiet harbour  ")
      await button(wrapper, "en", "Save").trigger("click")
      await settle()
      expect(store.updateDescription).toHaveBeenCalledExactlyOnceWith(
        "img-1",
        "en",
        "A quiet harbour"
      )
      expect(text(wrapper, "en").element.value).toBe("A quiet harbour")
      expect(row(wrapper, "en").get(".status").text()).toBe("Edited")
      expect(disabled(wrapper, "en", "Save")).toBe(true)
      expect(text(wrapper, "es").element.value).toBe("")
      expect(row(wrapper, "es").get(".status").text()).toBe("Pending")
      expect(toast).toHaveBeenCalledExactlyOnceWith({
        description: "English description saved.",
        title: "Description Updated",
        type: "success"
      })
    })

    it("polls for translations discarded by saving the source language", async () => {
      const wrapper = await render([written("en", "A harbour"), written("es", "Un puerto")])
      store.updateDescription.mockResolvedValueOnce([
        written("en", "A quiet harbour", "edited"),
        pending("es")
      ])
      store.fetchDescriptions.mockResolvedValueOnce([
        written("en", "A quiet harbour", "edited"),
        written("es", "Un puerto tranquilo", "translated")
      ])
      await text(wrapper, "en").setValue("A quiet harbour")
      await button(wrapper, "en", "Save").trigger("click")
      await vi.advanceTimersByTimeAsync(POLL)
      expect(text(wrapper, "es").element.value).toBe("Un puerto tranquilo")
    })

    it("locks the row and every action until the request settles", async () => {
      const request = deferred<ImageDescription[]>()
      const wrapper = await render([written("en", "A harbour"), written("es", "Un puerto")])
      store.updateDescription.mockReturnValueOnce(request.promise)
      await text(wrapper, "en").setValue("A quiet harbour")
      await text(wrapper, "es").setValue("Un puerto tranquilo")
      await button(wrapper, "en", "Save").trigger("click")
      expect(text(wrapper, "en").element.disabled).toBe(true)
      expect(text(wrapper, "es").element.disabled).toBe(false)
      for (const language of ["en", "es"]) {
        expect(disabled(wrapper, language, "Save")).toBe(true)
        expect(disabled(wrapper, language, "Regenerate")).toBe(true)
      }
      await button(wrapper, "es", "Save").trigger("click")
      expect(store.updateDescription).toHaveBeenCalledTimes(1)
      request.resolve([written("en", "A quiet harbour", "edited"), written("es", "Un puerto")])
      await settle()
      expect(text(wrapper, "en").element.disabled).toBe(false)
      expect(text(wrapper, "es").element.value).toBe("Un puerto tranquilo")
      expect(disabled(wrapper, "es", "Save")).toBe(false)
      expect(disabled(wrapper, "en", "Regenerate")).toBe(false)
    })

    it("keeps the draft and stays quiet when the request fails", async () => {
      const wrapper = await render([written("en", "A harbour")])
      store.updateDescription.mockRejectedValueOnce(new Error("Description text too long"))
      await text(wrapper, "en").setValue("A quiet harbour")
      await button(wrapper, "en", "Save").trigger("click")
      await settle()
      expect(text(wrapper, "en").element.value).toBe("A quiet harbour")
      expect(text(wrapper, "en").element.disabled).toBe(false)
      expect(row(wrapper, "en").get(".status").text()).toBe("Generated")
      expect(disabled(wrapper, "en", "Save")).toBe(false)
      expect(toast).not.toHaveBeenCalled()
    })

    it("resumes polling for pending languages after a failed request", async () => {
      const wrapper = await render([written("en", "A harbour"), pending("es")])
      store.updateDescription.mockRejectedValueOnce(new Error("Network"))
      store.fetchDescriptions.mockResolvedValueOnce([
        written("en", "A harbour"),
        written("es", "Un puerto", "translated")
      ])
      await text(wrapper, "en").setValue("A quiet harbour")
      await button(wrapper, "en", "Save").trigger("click")
      await vi.advanceTimersByTimeAsync(POLL)
      expect(text(wrapper, "es").element.value).toBe("Un puerto")
      expect(text(wrapper, "en").element.value).toBe("A quiet harbour")
    })

    it("ignores a poll that answers after the save", async () => {
      const poll = deferred<ImageDescription[]>()
      const wrapper = await render([written("en", "A harbour"), pending("es")])
      store.fetchDescriptions.mockReturnValueOnce(poll.promise)
      await vi.advanceTimersByTimeAsync(POLL)
      store.updateDescription.mockResolvedValueOnce([
        written("en", "A harbour"),
        written("es", "Mi puerto", "edited")
      ])
      await text(wrapper, "es").setValue("Mi puerto")
      await button(wrapper, "es", "Save").trigger("click")
      await settle()
      poll.resolve([written("en", "A harbour"), pending("es")])
      await settle()
      expect(text(wrapper, "es").element.value).toBe("Mi puerto")
      expect(row(wrapper, "es").get(".status").text()).toBe("Edited")
      await vi.advanceTimersByTimeAsync(POLL * 3)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(2)
    })
  })

  describe("regenerating", () => {
    it("discards one language, drops its unsaved text and waits for the new one", async () => {
      const wrapper = await render([written("en", "A harbour"), written("es", "Un puerto")])
      store.regenerateDescriptions.mockResolvedValueOnce([
        written("en", "A harbour"),
        pending("es")
      ])
      store.fetchDescriptions.mockResolvedValueOnce([
        written("en", "A harbour"),
        written("es", "Un puerto nuevo", "translated")
      ])
      await text(wrapper, "es").setValue("Borrador")
      await button(wrapper, "es", "Regenerate").trigger("click")
      await settle()
      expect(store.regenerateDescriptions).toHaveBeenCalledExactlyOnceWith("img-1", ["es"])
      expect(text(wrapper, "es").element.value).toBe("")
      expect(row(wrapper, "es").get(".status").text()).toBe("Pending")
      expect(disabled(wrapper, "es", "Regenerate")).toBe(true)
      expect(toast).toHaveBeenCalledExactlyOnceWith({
        description: "Spanish description will be generated again.",
        title: "Description Updated",
        type: "success"
      })
      await vi.advanceTimersByTimeAsync(POLL)
      expect(text(wrapper, "es").element.value).toBe("Un puerto nuevo")
      expect(row(wrapper, "es").get(".status").text()).toBe("Translated")
    })

    it("keeps the text when the request fails", async () => {
      const wrapper = await render([written("en", "A harbour")])
      store.regenerateDescriptions.mockRejectedValueOnce(new Error("Network"))
      await button(wrapper, "en", "Regenerate").trigger("click")
      await settle()
      expect(text(wrapper, "en").element.value).toBe("A harbour")
      expect(disabled(wrapper, "en", "Regenerate")).toBe(false)
      expect(toast).not.toHaveBeenCalled()
    })
  })

  describe("after leaving", () => {
    const leave = async (start: (wrapper: Wrapper) => Promise<void>, request: Request) => {
      const wrapper = await render([written("en", "A harbour"), pending("es")])
      await start(wrapper)
      wrapper.unmount()
      await request()
      await vi.advanceTimersByTimeAsync(POLL * 3)
    }

    it("stops polling", async () => {
      await leave(
        () => Promise.resolve(),
        () => Promise.resolve([])
      )
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
    })

    it("does not start polling again when a poll answers late", async () => {
      const poll = deferred<ImageDescription[]>()
      store.fetchDescriptions.mockResolvedValueOnce([written("en", "A harbour"), pending("es")])
      const wrapper = mount(DescriptionEditor, {
        global: { stubs: { Icon: true } },
        props: { imageId: "img-1" }
      })
      await settle()
      store.fetchDescriptions.mockReturnValueOnce(poll.promise)
      await vi.advanceTimersByTimeAsync(POLL)
      wrapper.unmount()
      poll.resolve([written("en", "A harbour"), pending("es")])
      await vi.advanceTimersByTimeAsync(POLL * 3)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(2)
    })

    it("does not start polling when the first load answers late", async () => {
      const first = deferred<ImageDescription[]>()
      store.fetchDescriptions.mockReturnValueOnce(first.promise)
      const wrapper = mount(DescriptionEditor, {
        global: { stubs: { Icon: true } },
        props: { imageId: "img-1" }
      })
      await settle()
      wrapper.unmount()
      first.resolve([pending("en")])
      await vi.advanceTimersByTimeAsync(POLL * 3)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
    })

    it("still confirms a save that finishes late, without polling", async () => {
      const save = deferred<ImageDescription[]>()
      store.updateDescription.mockReturnValueOnce(save.promise)
      await leave(
        async (wrapper) => {
          await text(wrapper, "en").setValue("A quiet harbour")
          await button(wrapper, "en", "Save").trigger("click")
        },
        () => {
          save.resolve([written("en", "A quiet harbour", "edited"), pending("es")])
          return save.promise
        }
      )
      expect(toast).toHaveBeenCalledTimes(1)
      expect(store.fetchDescriptions).toHaveBeenCalledTimes(1)
    })
  })
})
