import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { h } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, collection, success } from "#src/stores/test/helpers"
import {
  finishViewerAnimations,
  installViewerEnvironment,
  viewerFlip,
  viewerPhotos
} from "#src/test/fullscreenFixtures"
import {
  flushGallery,
  gallerySettings,
  loadGalleryImages,
  registerGallery
} from "#src/test/galleryFixtures"
import api from "#src/utils/api"
import Home from "#src/views/Home.vue"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/fullscreenFixtures")).viewerGsap }))
vi.mock("gsap/Flip", async () => ({
  Flip: (await import("#src/test/fullscreenFixtures")).viewerFlip
}))
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
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
  gallerySettings.value = { capFrameRate: false, nativeScroll: true }
})
afterEach(() => {
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("gallery to fullscreen integration", () => {
  it("opens a real card, navigates its collection and closes through the gallery return callback", async () => {
    const environment = installViewerEnvironment()
    const photos = viewerPhotos()
    const images = useImagesStore()
    images.orderBy = "date"
    vi.mocked(api.get).mockResolvedValueOnce(success({ images: photos }))
    await images.fetchAll()
    vi.mocked(api.get).mockResolvedValueOnce(
      success({ collections: [collection("album", photos)] })
    )
    await useCollectionsStore().fetchAll()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
    })
    await router.push("/?columns=2&keep=yes")
    await router.isReady()
    history.replaceState(
      { current: "/?columns=2&keep=yes", position: 0 },
      "",
      "/?columns=2&keep=yes"
    )
    const wrapper = mount(
      { render: () => h("div", [h(Home), h(FullscreenImage)]) },
      {
        attachTo: document.body,
        global: { plugins: [router, pinia], stubs: { EmptyGalleryState: true, Icon: true } }
      }
    )
    await flushGallery()
    await environment.step(2)
    await loadGalleryImages(wrapper.element)
    await environment.step(30)
    const card = wrapper.get('.image-card[data-flip-id="img-photo-0"]')
    await card.trigger("click")
    await flushGallery()
    await finishViewerAnimations()
    const state = useFullscreenImage()
    expect(state.imageData.value?.id).toBe("photo-0")
    expect(viewerFlip.getState).toHaveBeenCalled()
    expect(useMenu().isVisible.value).toBe(false)
    const callback = state.onReturn.value
    if (!callback) throw new Error("Missing gallery return callback")
    const onReturn = vi.fn(callback)
    state.onReturn.value = onReturn
    await wrapper.get(".nav-arrow-right").trigger("click")
    await flushGallery()
    await finishViewerAnimations()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.imageData.value?.id).toBe("photo-1")
    expect(location.pathname).toBe("/images/photo-1")
    await wrapper.get(".top-left button").trigger("click")
    await flushGallery()
    await finishViewerAnimations()
    await environment.step(30)
    expect(onReturn).toHaveBeenCalledExactlyOnceWith(false, true, undefined)
    expect(state.imageData.value).toBeNull()
    expect(location.pathname).toBe("/")
    expect(location.search).toBe("?columns=2&keep=yes")
    expect(router.currentRoute.value.path).toBe("/")
    expect(useMenu().isVisible.value).toBe(true)
    expect(wrapper.findAll(".image-card")).toHaveLength(3)
    expect(wrapper.getComponent(Home).find(".image-gallery").exists()).toBe(true)
  })
})
