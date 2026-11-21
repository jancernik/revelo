import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { h } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { activatePinia, deferred, failure, success } from "#src/stores/test/helpers"
import {
  finishViewerAnimations,
  installViewerEnvironment,
  viewerPhotos
} from "#src/test/fullscreenFixtures"
import { flushGallery, gallerySettings } from "#src/test/galleryFixtures"
import api from "#src/utils/api"
import ImageView from "#src/views/Image.vue"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/fullscreenFixtures")).viewerGsap }))
vi.mock("gsap/Flip", async () => ({
  Flip: (await import("#src/test/fullscreenFixtures")).viewerFlip
}))
vi.mock("#src/composables/useSettings", () => ({
  useSettings: () => ({ settings: gallerySettings })
}))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))
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
  installViewerEnvironment()
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
  useMenu().show(false)
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
const routerFor = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push("/images/photo-0")
  await router.isReady()
  return router
}
const render = async () => {
  const router = await routerFor()
  const wrapper = mount(ImageView, {
    global: { plugins: [router, pinia] },
    props: { id: "photo-0" },
    slots: { default: "Route slot" }
  })
  await flushGallery()
  return { router, state: useFullscreenImage(), wrapper }
}

describe("Image route", () => {
  it("fetches its prop id, hides the menu and opens without updating the route", async () => {
    const photo = { ...viewerPhotos()[0], collectionId: null }
    vi.mocked(api.get).mockResolvedValueOnce(success({ image: photo }))
    const setup = await render()
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/images/photo-0", { params: {} })
    expect(setup.state.imageData.value).toEqual(photo)
    expect(setup.state.updateRoute.value).toBe(false)
    expect(useMenu().isVisible.value).toBe(false)
    expect(setup.wrapper.text()).toBe("Route slot")
  })

  it("keeps the viewer closed and menu hidden while the request is pending", async () => {
    const request =
      deferred<ReturnType<typeof success<{ image: ReturnType<typeof viewerPhotos>[number] }>>>()
    vi.mocked(api.get).mockReturnValueOnce(request.promise)
    const setup = await render()
    expect(setup.state.imageData.value).toBeNull()
    expect(useMenu().isVisible.value).toBe(false)
    request.resolve(success({ image: viewerPhotos()[0] }))
    await flushGallery()
    expect(setup.state.imageData.value?.id).toBe("photo-0")
  })

  it("does not request hidden images when signed out and redirects their rejected fetch", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(failure("Request failed", "Image not found"))
    const setup = await render()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/images/photo-0", { params: {} })
    expect(setup.router.currentRoute.value.path).toBe("/")
    expect(setup.state.imageData.value).toBeNull()
  })

  it("still calls show(null) and registers a popstate listener after a failed fetch (quirk)", async () => {
    const add = vi.spyOn(window, "addEventListener")
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network"))
    const setup = await render()
    await vi.advanceTimersByTimeAsync(0)
    expect(setup.router.currentRoute.value.path).toBe("/")
    expect(setup.state.updateRoute.value).toBe(false)
    expect(add).toHaveBeenCalledWith("popstate", expect.any(Function))
  })

  it("requests the global viewer to hide on unmount", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      success({ image: { ...viewerPhotos()[0], collectionId: null } })
    )
    const setup = await render()
    setup.wrapper.unmount()
    expect(setup.state.triggerHide.value).toBe(true)
  })

  it("does not fetch again when the id prop changes (quirk)", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      success({ image: { ...viewerPhotos()[0], collectionId: null } })
    )
    const setup = await render()
    await setup.wrapper.setProps({ id: "photo-1" })
    expect(api.get).toHaveBeenCalledOnce()
    expect(setup.state.imageData.value?.id).toBe("photo-0")
  })

  it("closes a directly opened loose image through the global viewer and navigates to home", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      success({ image: { ...viewerPhotos()[0], collectionId: null } })
    )
    const router = await routerFor()
    const wrapper = mount(
      { render: () => h("div", [h(ImageView, { id: "photo-0" }), h(FullscreenImage)]) },
      { attachTo: document.body, global: { plugins: [router, pinia], stubs: { Icon: true } } }
    )
    await flushGallery()
    await finishViewerAnimations()
    await wrapper.get(".top-left button").trigger("click")
    await flushGallery()
    await finishViewerAnimations()
    await vi.advanceTimersByTimeAsync(0)
    expect(router.currentRoute.value.path).toBe("/")
    expect(useFullscreenImage().imageData.value).toBeNull()
  })
})
