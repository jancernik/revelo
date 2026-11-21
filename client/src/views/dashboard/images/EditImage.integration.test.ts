import type { Pinia } from "pinia"

import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import type { ImageDescription } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, failure, success } from "#src/stores/test/helpers"
import { gridCollection, gridImage } from "#src/test/gridFixtures"
import api from "#src/utils/api"
import EditImage from "#src/views/dashboard/images/EditImage.vue"

const toast = vi.hoisted(() => vi.fn())
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useSortableGrid", () => ({
  useSortableGrid: () => ({ cleanup: vi.fn(), init: vi.fn() })
}))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))

enableAutoUnmount(afterEach)
let pinia: Pinia
beforeEach(() => {
  vi.resetAllMocks()
  pinia = activatePinia()
  useDashboardLayout().reset()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  useDashboardLayout().reset()
  vi.unstubAllGlobals()
})

const ID = "c-0"
const UPDATED = "2026-11-16T12:00:00.000Z"
const generated: ImageDescription[] = [
  { language: "en", source: "generated", text: "A harbour", updatedAt: UPDATED },
  { language: "es", source: "translated", text: "Un puerto", updatedAt: UPDATED }
]

const setup = async (
  descriptions: Promise<unknown> = Promise.resolve(success({ descriptions: generated }))
) => {
  const initial = gridCollection("c", 2)
  const images = useImagesStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ images: initial.images }))
  await images.fetchAll({ force: true })
  const collections = useCollectionsStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ collections: [initial] }))
  await collections.fetchAll({ force: true })
  vi.mocked(api.get).mockReset().mockReturnValue(descriptions)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push(`/dashboard/images/${ID}/edit`)
  await router.isReady()
  const global = { plugins: [router, pinia], stubs: { Icon: true } }
  const wrapper = mount(EditImage, { global, props: { id: ID } })
  await flushPromises()
  const grid = () => mount(ImageGrid, { global, props: { images: images.images } })
  return { collections, grid, images, wrapper }
}

const english = (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) => {
  const row = wrapper.get('[data-language="en"]')
  const save = row.findAll("button").find((item) => item.text() === "Save")
  if (!save) throw new Error("Missing save button")
  return { save, text: row.get("textarea") }
}

describe("editing descriptions from the image editor", () => {
  it("loads the list for the cached image and adopts it as the image's descriptions", async () => {
    const { collections, images, wrapper } = await setup()
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/images/${ID}/descriptions`)
    expect(english(wrapper).text.element.value).toBe("A harbour")
    const expected = { en: "A harbour", es: "Un puerto" }
    expect(images.images[0]?.descriptions).toEqual(expected)
    expect(collections.collections[0]?.images?.[0]?.descriptions).toEqual(expected)
    expect(images.images[1]?.descriptions).toEqual(gridImage("c-1").descriptions)
  })

  it("saves a description and uses it as the alternative text across the dashboard", async () => {
    const { collections, grid, images, wrapper } = await setup()
    vi.mocked(api.put).mockResolvedValue(
      success({
        descriptions: [
          { language: "en", source: "edited", text: "A quiet harbour", updatedAt: UPDATED },
          { language: "es", source: null, text: null, updatedAt: null }
        ]
      })
    )
    await english(wrapper).text.setValue(" A quiet harbour ")
    await english(wrapper).save.trigger("click")
    await flushPromises()
    expect(api.put).toHaveBeenCalledExactlyOnceWith(`/images/${ID}/descriptions/en`, {
      text: "A quiet harbour"
    })
    expect(images.images[0]?.descriptions).toEqual({ en: "A quiet harbour" })
    expect(collections.collections[0]?.images?.[0]?.descriptions).toEqual({ en: "A quiet harbour" })
    expect(grid().get("img").attributes("alt")).toBe("A quiet harbour")
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "English description saved.",
      title: "Description Updated",
      type: "success"
    })
  })

  it("reports a rejected description with the server message and keeps the draft", async () => {
    const { images, wrapper } = await setup()
    vi.mocked(api.put).mockRejectedValue(failure("Request failed", "Description text too long"))
    await english(wrapper).text.setValue("A quiet harbour")
    await english(wrapper).save.trigger("click")
    await flushPromises()
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "Description text too long",
      title: "Error Saving Description",
      type: "error"
    })
    expect(english(wrapper).text.element.value).toBe("A quiet harbour")
    expect(images.images[0]?.descriptions).toEqual({ en: "A harbour", es: "Un puerto" })
  })

  it("keeps the metadata form usable when the descriptions cannot be loaded", async () => {
    const { wrapper } = await setup(Promise.reject(failure("Request failed", "Image not found")))
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "Image not found",
      title: "Error Loading Descriptions",
      type: "error"
    })
    expect(wrapper.findAll(".description")).toHaveLength(0)
    expect(wrapper.find(".metadata-editor").exists()).toBe(true)
  })
})
