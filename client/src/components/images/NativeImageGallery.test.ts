import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { GalleryHandle } from "#src/components/images/types"

import EmptyGalleryState from "#src/components/images/EmptyGalleryState.vue"
import NativeImageGallery from "#src/components/images/NativeImageGallery.vue"
import Loading from "#src/components/Loading.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, success } from "#src/stores/test/helpers"
import {
  finishTweens,
  flushGallery,
  fullscreenShow,
  galleryGsap,
  galleryImages,
  gallerySettings,
  installGalleryEnvironment,
  loadGalleryImages,
  tweens
} from "#src/test/galleryFixtures"
import api from "#src/utils/api"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/galleryFixtures")).galleryGsap }))
vi.mock("#src/composables/useSettings", () => ({
  useSettings: () => ({ settings: gallerySettings })
}))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))
vi.mock("#src/composables/useFullscreenImage", async (importOriginal) => {
  const original = await importOriginal<typeof import("#src/composables/useFullscreenImage")>()
  return {
    ...original,
    useFullscreenImage: () => {
      const state = original.useFullscreenImage()
      return {
        ...state,
        show: (...args: Parameters<typeof state.show>) => {
          fullscreenShow(...args)
          state.show(...args)
        }
      }
    }
  }
})
let pinia: Pinia
let environment: ReturnType<typeof installGalleryEnvironment>
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  tweens.length = 0
  pinia = activatePinia()
  gallerySettings.value = { capFrameRate: false, nativeScroll: true }
  environment = installGalleryEnvironment({ height: 844, touch: true, width: 390 })
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
  useMenu().show(false)
  useMenu().hide(false)
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
const render = async (
  props: Partial<{ columns: number; menuVisible: boolean }> = {},
  count = 12
) => {
  const store = useImagesStore()
  store.orderBy = "date"
  vi.mocked(api.get).mockResolvedValueOnce(success({ images: galleryImages(count) }))
  await store.fetchAll()
  const wrapper = mount(NativeImageGallery, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { EmptyGalleryState: true } },
    props
  })
  await flushGallery()
  const handle: GalleryHandle & { isAnimating: () => boolean } = wrapper.vm
  return { handle, store, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const intersect = async () => {
  environment.observers.at(-1)?.emit()
  await flushGallery()
}
const ready = async (setup: Setup) => {
  await intersect()
  await loadGalleryImages(setup.wrapper.element)
  await vi.advanceTimersByTimeAsync(550)
  finishTweens()
  await flushGallery()
}
const shown = () => {
  const call = fullscreenShow.mock.calls.at(-1)
  if (!call || !call[0] || !call[1]) throw new Error("Missing fullscreen request")
  return { image: call[0], options: call[1] }
}

describe("NativeImageGallery", () => {
  it("renders native image cards, observes the buffer and advances loading to ready", async () => {
    const setup = await render()
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(2)
    expect(setup.wrapper.findAll(".image-card.native-layout")).toHaveLength(12)
    expect(setup.wrapper.getComponent(Loading).props("progress")).toBe(0)
    const observer = environment.observers[0]
    expect(observer?.root).toBe(setup.wrapper.get(".native-gallery").element)
    expect(observer?.rootMargin).toBe("400px 0px")
    expect(observer?.observe).toHaveBeenCalledTimes(12)
    await intersect()
    await setup.wrapper.get(".tiny-fallback").trigger("load")
    expect(setup.wrapper.getComponent(Loading).props("progress")).toBeCloseTo(100 / 24)
    await ready(setup)
    expect(setup.wrapper.findComponent(Loading).exists()).toBe(false)
    expect(useMenu().isVisible.value).toBe(true)
    expect(galleryGsap.to).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 0.2, ease: "sine.inOut", opacity: 1, scale: 1 })
    )
  })

  it("renders the empty state for empty or failed initial data", async () => {
    const setup = await render({}, 0)
    setup.store.error = "Fetch failed"
    await flushGallery()
    expect(setup.wrapper.findComponent(EmptyGalleryState).exists()).toBe(true)
    expect(setup.wrapper.findComponent(Loading).exists()).toBe(false)
    expect(environment.observers).toHaveLength(0)
    expect(setup.wrapper.text()).not.toContain("Fetch failed")
  })

  it("locks and restores native scroll through the exposed handle", async () => {
    const setup = await render()
    const scroller = setup.wrapper.get<HTMLDivElement>(".native-gallery")
    scroller.element.scrollTop = 220
    setup.handle.pauseScrolling()
    expect(setup.handle.isScrollPaused()).toBe(true)
    expect(scroller.element.style.overflowY).toBe("hidden")
    expect(scroller.element.style.touchAction).toBe("none")
    scroller.element.scrollTop = 900
    setup.handle.resumeScrolling()
    expect(scroller.element.scrollTop).toBe(220)
    expect(scroller.element.style.overflowY).toBe("")
    expect(scroller.element.style.touchAction).toBe("")
    expect(setup.handle.isScrollPaused()).toBe(false)
    setup.handle.startAutoScroll()
    setup.handle.stopAutoScroll()
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
    expect(setup.handle.queueAutoScrollResume).toBeUndefined()
    expect(environment.frames.size).toBe(0)
  })

  it("queues every settle callback and waits for 120ms without scroll events", async () => {
    const setup = await render()
    const first = vi.fn()
    const second = vi.fn()
    setup.handle.onSettle(first)
    expect(first).toHaveBeenCalledOnce()
    await setup.wrapper.get(".native-gallery").trigger("scroll")
    expect(setup.handle.isAnimating()).toBe(true)
    setup.handle.onSettle(first)
    setup.handle.onSettle(second)
    await vi.advanceTimersByTimeAsync(119)
    expect(second).not.toHaveBeenCalled()
    await setup.wrapper.get(".native-gallery").trigger("scroll")
    await vi.advanceTimersByTimeAsync(119)
    expect(second).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(setup.handle.isAnimating()).toBe(false)
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(500)
    expect(second).toHaveBeenCalledOnce()
  })

  it("updates the locked position when a scroll event arrives while paused (quirk)", async () => {
    const setup = await render()
    const root = setup.wrapper.get<HTMLDivElement>(".native-gallery")
    setup.handle.pauseScrolling()
    root.element.scrollTop = 150
    await root.trigger("scroll")
    root.element.scrollTop = 300
    setup.handle.resumeScrolling()
    expect(root.element.scrollTop).toBe(150)
  })

  it("opens fullscreen with callbacks, rejects duplicate opens and restores the same card after return", async () => {
    const setup = await render()
    await ready(setup)
    const card = setup.wrapper.get<HTMLDivElement>(".image-card")
    await card.trigger("click")
    const request = shown()
    expect(request.image.id).toBe(card.get("img.thumbnail").attributes("data-id"))
    expect(request.options).toMatchObject({ flipId: `img-${request.image.id}`, queryParams: "" })
    expect(request.options.isThumbnailVisible?.()).toBe(true)
    expect(setup.handle.isScrollPaused()).toBe(true)
    expect(useMenu().isVisible.value).toBe(false)
    expect(() => request.options.updatePositions?.()).not.toThrow()
    await card.trigger("click")
    expect(fullscreenShow).toHaveBeenCalledOnce()
    request.options.onReturn?.(true, false, 2)
    useFullscreenImage().completeHide()
    await vi.advanceTimersByTimeAsync(1999)
    expect(setup.handle.isScrollPaused()).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect(setup.handle.isScrollPaused()).toBe(false)
    expect(useMenu().isVisible.value).toBe(true)
    finishTweens()
    expect(card.element.style.visibility).toBe("visible")
  })

  it("uses geometric thumbnail visibility and reveals cards on a different-image return", async () => {
    const setup = await render()
    await ready(setup)
    const card = setup.wrapper.get<HTMLDivElement>(".image-card")
    await card.trigger("click")
    vi.spyOn(card.element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, -1000, 100, 100))
    expect(shown().options.isThumbnailVisible?.()).toBe(false)
    shown().options.onReturn?.(false, true, 0.5)
    finishTweens()
    expect(card.element.style.opacity).toBe("1")
  })

  it("rebuilds columns on resize, disconnects old observers and retains loaded image state", async () => {
    const setup = await render()
    await ready(setup)
    const initial = environment.observers[0]
    await environment.resize(800)
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(3)
    expect(initial?.disconnect).toHaveBeenCalled()
    expect(environment.observers.at(-1)?.observe).toHaveBeenCalledTimes(12)
    await setup.wrapper.setProps({ columns: 4 })
    await flushGallery()
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(4)
    expect(setup.wrapper.findAll(".image-card")).toHaveLength(12)
    expect(setup.wrapper.findComponent(Loading).exists()).toBe(false)
  })

  it("does not show the menu when menuVisible is false", async () => {
    const setup = await render({ menuVisible: false })
    await ready(setup)
    expect(useMenu().isVisible.value).toBe(false)
    expect(galleryGsap.ticker.fps).not.toHaveBeenCalled()
  })

  it("disconnects the observer, kills zoom, flushes settle callbacks and clears timers on unmount", async () => {
    const setup = await render()
    await ready(setup)
    await setup.wrapper.get(".image-card").trigger("click")
    const tween = tweens.at(-1)
    await setup.wrapper.get(".native-gallery").trigger("scroll")
    const settled = vi.fn()
    setup.handle.onSettle(settled)
    const observer = environment.observers.at(-1)
    setup.wrapper.unmount()
    expect(observer?.disconnect).toHaveBeenCalled()
    expect(tween?.kill).toHaveBeenCalledOnce()
    expect(settled).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(environment.frames.size).toBe(0)
  })
})
