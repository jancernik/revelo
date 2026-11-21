import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, collection, success } from "#src/stores/test/helpers"
import {
  flushGallery,
  galleryImages,
  gallerySettings,
  installGalleryEnvironment,
  loadGalleryImages,
  registerGallery
} from "#src/test/galleryFixtures"
import api from "#src/utils/api"
import Home from "#src/views/Home.vue"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/galleryFixtures")).galleryGsap }))
vi.mock("#src/composables/useSettings", () => ({
  useSettings: () => ({ settings: gallerySettings })
}))
vi.mock("#src/composables/useTheme", () => ({
  useTheme: () => ({ registerImageGallery: registerGallery })
}))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))
let pinia: Pinia
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  pinia = activatePinia()
  gallerySettings.value = { capFrameRate: false, nativeScroll: true }
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
})
afterEach(() => {
  useFullscreenImage().completeHide()
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("Home with real stores and galleries", () => {
  it.each([false, true])(
    "renders fetched images and opens the shared fullscreen state: native %s",
    async (native) => {
      const environment = installGalleryEnvironment({ touch: native })
      const photos = galleryImages(8)
      const images = useImagesStore()
      const collections = useCollectionsStore()
      images.orderBy = "date"
      vi.mocked(api.get).mockResolvedValueOnce(success({ images: photos }))
      await images.fetchAll()
      vi.mocked(api.get).mockResolvedValueOnce(
        success({ collections: [collection("album", photos)] })
      )
      await collections.fetchAll()
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ component: { template: "<div />" }, path: "/" }]
      })
      await router.push("/?columns=2")
      await router.isReady()
      const wrapper = mount(Home, {
        attachTo: document.body,
        global: { plugins: [router, pinia], stubs: { EmptyGalleryState: true } }
      })
      await flushGallery()
      await environment.step(2)
      environment.observers.at(-1)?.emit()
      await loadGalleryImages(wrapper.element)
      await environment.step(30)
      expect(api.get).toHaveBeenCalledWith("/images", { params: { order: "asc", orderBy: "date" } })
      expect(api.get).toHaveBeenCalledWith("/collections", { params: {} })
      expect(collections.collections[0]?.images).toHaveLength(8)
      expect(wrapper.find(".native-gallery").exists()).toBe(native)
      expect(wrapper.findAll(".image-card")).toHaveLength(8)
      expect(registerGallery.mock.calls.at(-1)?.[0]).toMatchObject({
        isScrollPaused: expect.any(Function),
        onSettle: expect.any(Function)
      })
      const card = wrapper.get(".image-card")
      const id = card.get("img.thumbnail").attributes("data-id")
      await card.trigger("click")
      const state = useFullscreenImage()
      expect(state.imageData.value?.id).toBe(id)
      expect(state.flipId.value).toBe(`img-${id}`)
      expect(state.queryParams.value).toBe(window.location.search)
      expect(state.isThumbnailVisible.value?.()).toBe(true)
      expect(state.onReturn.value).toEqual(expect.any(Function))
    }
  )
})
