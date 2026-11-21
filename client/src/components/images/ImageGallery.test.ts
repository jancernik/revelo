import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { GalleryHandle } from "#src/components/images/types"

import EmptyGalleryState from "#src/components/images/EmptyGalleryState.vue"
import ImageGallery from "#src/components/images/ImageGallery.vue"
import Loading from "#src/components/Loading.vue"
import { useDialog } from "#src/composables/useDialog"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, success } from "#src/stores/test/helpers"
import {
  flushGallery,
  fullscreenShow,
  galleryGsap,
  galleryImages,
  gallerySettings,
  installGalleryEnvironment,
  loadGalleryImages,
  yPosition
} from "#src/test/galleryFixtures"
import api from "#src/utils/api"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/galleryFixtures")).galleryGsap }))
vi.mock("#src/composables/useSettings", async () => ({
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
  pinia = activatePinia()
  gallerySettings.value = { capFrameRate: false, nativeScroll: true }
  environment = installGalleryEnvironment()
  useFullscreenImage().isAnimating.value = false
  useFullscreenImage().completeHide()
  useMenu().show(false)
  useMenu().hide(false)
  useMenu().setSearchCollapseCallback(() => {})
  useDialog().hide()
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
  props: Partial<{
    alternatingScroll: boolean
    columns: number
    continuousScroll: boolean
    menuVisible: boolean
    scrollSpeed: number
  }> = {},
  count = 12
) => {
  const store = useImagesStore()
  store.orderBy = "date"
  vi.mocked(api.get).mockResolvedValueOnce(success({ images: galleryImages(count) }))
  await store.fetchAll()
  const wrapper = mount(ImageGallery, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { EmptyGalleryState: true } },
    props: { columns: 2, ...props }
  })
  await flushGallery()
  await environment.step(2)
  const handle: GalleryHandle & { isAnimating: () => boolean } = wrapper.vm
  return { handle, store, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const ready = async (setup: Setup) => {
  await loadGalleryImages(setup.wrapper.element)
  await environment.step(30)
}
const wheel = (setup: Setup, deltaY = 60) => {
  const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY })
  setup.wrapper.get(".image-gallery").element.dispatchEvent(event)
  return event
}
const shown = () => {
  const call = fullscreenShow.mock.calls.at(-1)
  if (!call || !call[0] || !call[1]) throw new Error("Missing fullscreen request")
  return { image: call[0], options: call[1] }
}
const mouse = (setup: Setup, type: string, clientY: number) =>
  setup.wrapper
    .get(".image-gallery")
    .element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientY }))

describe("ImageGallery", () => {
  it("tracks loading to ready but keeps the hidden loader mounted until another render (quirk)", async () => {
    const setup = await render()
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(2)
    expect(setup.wrapper.findAll(".image-card")).toHaveLength(12)
    expect(setup.handle.isScrollPaused()).toBe(true)
    expect(setup.wrapper.getComponent(Loading).props("progress")).toBe(0)
    await setup.wrapper.get(".tiny-fallback").trigger("load")
    const progress = setup.wrapper.getComponent(Loading).props("progress")
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThan(100)
    await ready(setup)
    expect(setup.wrapper.get<HTMLDivElement>(".loading-indicator").element.style.display).toBe(
      "none"
    )
    expect(setup.handle.isScrollPaused()).toBe(false)
    expect(useMenu().isVisible.value).toBe(true)
    expect(setup.wrapper.get<HTMLDivElement>(".image-card").element.style.visibility).toBe(
      "visible"
    )
  })

  it("shows the empty state for empty or failed initial data without its own error UI", async () => {
    const setup = await render({}, 0)
    setup.store.error = "Fetch failed"
    await flushGallery()
    expect(setup.wrapper.findComponent(EmptyGalleryState).exists()).toBe(true)
    expect(setup.wrapper.findComponent(Loading).exists()).toBe(false)
    expect(setup.wrapper.findAll(".image-card")).toHaveLength(0)
    expect(setup.wrapper.text()).not.toContain("Fetch failed")
  })

  it("opens a card with the flip id, query and working return/position/visibility callbacks", async () => {
    const setup = await render()
    await ready(setup)
    const card = setup.wrapper.get<HTMLDivElement>(".image-card")
    await card.trigger("click")
    const request = shown()
    expect(request.image.id).toBe(card.get("img.thumbnail").attributes("data-id"))
    expect(request.options).toMatchObject({ flipId: `img-${request.image.id}`, queryParams: "" })
    expect(request.options.isThumbnailVisible?.()).toBe(true)
    expect(setup.handle.isScrollPaused()).toBe(true)
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
    expect(useMenu().isVisible.value).toBe(false)
    request.options.updatePositions?.()
    await card.trigger("click")
    expect(fullscreenShow).toHaveBeenCalledOnce()
    request.options.onReturn?.(true, false, 2)
    useFullscreenImage().completeHide()
    await environment.step(20)
    expect(setup.handle.isScrollPaused()).toBe(true)
    await environment.step(25)
    expect(setup.handle.isScrollPaused()).toBe(false)
    expect(useMenu().isVisible.value).toBe(true)
    expect(card.element.style.visibility).toBe("visible")
  })

  it("reveals surrounding cards when returning after a different fullscreen image", async () => {
    const setup = await render()
    await ready(setup)
    await setup.wrapper.get(".image-card").trigger("click")
    shown().options.onReturn?.(false, true, 0.5)
    useFullscreenImage().completeHide()
    await environment.step(30)
    expect(setup.handle.isScrollPaused()).toBe(false)
    expect(setup.wrapper.get<HTMLDivElement>(".image-card").element.style.opacity).toBe("1")
  })

  it("pauses input, resumes scrolling and settles once inertia and column targets stop", async () => {
    const setup = await render()
    await ready(setup)
    const card = setup.wrapper.get(".image-card").element
    const original = yPosition(card)
    setup.handle.pauseScrolling()
    expect(wheel(setup).defaultPrevented).toBe(true)
    await environment.step(2)
    expect(yPosition(card)).toBe(original)
    setup.handle.resumeScrolling()
    wheel(setup)
    await environment.step(2)
    expect(yPosition(card)).toBeLessThan(original)
    expect(setup.handle.isAnimating()).toBe(true)
    const settled = vi.fn()
    setup.handle.onSettle(settled)
    await environment.step(100)
    expect(settled).toHaveBeenCalledOnce()
    expect(setup.handle.isAnimating()).toBe(false)
    setup.handle.onSettle(settled)
    expect(settled).toHaveBeenCalledTimes(2)
  })

  it("replaces an earlier pending settle callback (quirk)", async () => {
    const setup = await render()
    await ready(setup)
    wheel(setup)
    const first = vi.fn()
    const second = vi.fn()
    setup.handle.onSettle(first)
    setup.handle.onSettle(second)
    await environment.step(100)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it("supports mouse drag and keeps drag click suppression for 50ms", async () => {
    const setup = await render()
    await ready(setup)
    mouse(setup, "mousedown", 400)
    await flushGallery()
    expect(setup.wrapper.get(".image-gallery").classes()).toContain("dragging")
    await environment.step(1)
    mouse(setup, "mousemove", 360)
    mouse(setup, "mouseup", 360)
    await flushGallery()
    await setup.wrapper.get(".image-card").trigger("click")
    expect(fullscreenShow).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(50)
    await setup.wrapper.get(".image-card").trigger("click")
    expect(fullscreenShow).toHaveBeenCalledOnce()
  })

  it("supports touch drag with the same public drag state", async () => {
    const setup = await render()
    await ready(setup)
    const target = setup.wrapper.get(".image-gallery").element
    const touch = (type: string, clientY: number) => {
      const event = new TouchEvent(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, "touches", { value: [{ clientY }] })
      target.dispatchEvent(event)
      return event
    }
    expect(touch("touchstart", 400).defaultPrevented).toBe(true)
    await environment.step(1)
    touch("touchmove", 350)
    await flushGallery()
    expect(setup.wrapper.get(".image-gallery").classes()).toContain("dragging")
    touch("touchend", 350)
    await flushGallery()
    expect(setup.wrapper.get(".image-gallery").classes()).not.toContain("dragging")
    expect(setup.handle.isAnimating()).toBe(true)
  })

  it("handles keyboard impulses, selection, Enter and Escape, but leaves keys alone for dialogs", async () => {
    const setup = await render()
    await ready(setup)
    const root = setup.wrapper.get<HTMLDivElement>(".image-gallery")
    const initial = yPosition(setup.wrapper.get(".image-card").element)
    await root.trigger("keydown", { key: "ArrowDown" })
    await environment.step(2)
    expect(yPosition(setup.wrapper.get(".image-card").element)).not.toBe(initial)
    setup.handle.pauseScrolling()
    setup.handle.resumeScrolling()
    const before = fullscreenShow.mock.calls.length
    root.element.focus()
    await root.trigger("keydown", { key: "Tab" })
    await environment.step(2)
    expect(document.activeElement?.classList.contains("image-card")).toBe(true)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(fullscreenShow.mock.calls.length).toBe(before + 1)
    useFullscreenImage().completeHide()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(document.activeElement?.classList.contains("image-card")).toBe(false)
    useDialog().show()
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "PageDown" })
    root.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it("keeps auto-scroll opt-in and allows start/stop plus delayed menu-coordinated resume", async () => {
    const setup = await render({ continuousScroll: true, menuVisible: false, scrollSpeed: 35 })
    await ready(setup)
    expect(setup.handle.isAutoScrollActive?.()).toBe(true)
    setup.handle.stopAutoScroll()
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
    setup.handle.startAutoScroll()
    expect(setup.handle.isAutoScrollActive?.()).toBe(true)
    wheel(setup)
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
    setup.handle.queueAutoScrollResume?.()
    await vi.advanceTimersByTimeAsync(3000)
    expect(useMenu().pendingHide.value).toBe(true)
    useMenu().flushPendingHide()
    expect(setup.handle.isAutoScrollActive?.()).toBe(true)
    setup.handle.stopAutoScroll()
    useMenu().show(false)
    useMenu().flushSearchCollapseCallback()
    await vi.advanceTimersByTimeAsync(3000)
    useMenu().flushPendingHide()
    expect(setup.handle.isAutoScrollActive?.()).toBe(true)
  })

  it("does not start auto-scroll for ordinary galleries or while search has focus", async () => {
    const setup = await render()
    await ready(setup)
    setup.handle.startAutoScroll()
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
    await setup.wrapper.setProps({ continuousScroll: true })
    const search = document.createElement("div")
    search.className = "image-searcher"
    const input = document.createElement("input")
    search.appendChild(input)
    document.body.appendChild(search)
    input.focus()
    setup.handle.startAutoScroll()
    expect(setup.handle.isAutoScrollActive?.()).toBe(false)
  })

  it("reverses alternating columns and rebuilds when forced columns change", async () => {
    const setup = await render({ alternatingScroll: true })
    await ready(setup)
    const cards = setup.wrapper
      .findAll(".gallery-column")
      .map((column) => column.get(".image-card").element)
    const initial = cards.map(yPosition)
    wheel(setup)
    await environment.step(2)
    expect(yPosition(cards[0])).toBeLessThan(initial[0])
    expect(yPosition(cards[1])).toBeGreaterThan(initial[1])
    await setup.wrapper.setProps({ columns: 3 })
    await environment.step(4)
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(3)
    expect(setup.wrapper.findAll(".image-card")).toHaveLength(12)
  })

  it("rebuilds responsive columns and wires the adaptive frame-rate cap on touch", async () => {
    gallerySettings.value.capFrameRate = true
    environment = installGalleryEnvironment({ touch: true })
    const setup = await render()
    await ready(setup)
    expect(galleryGsap.ticker.fps).toHaveBeenCalledWith(75)
    await setup.wrapper.setProps({ columns: undefined })
    await environment.resize(800)
    await environment.step(3)
    expect(setup.wrapper.findAll(".gallery-column")).toHaveLength(3)
    wheel(setup)
    const before = galleryGsap.set.mock.calls.length
    await environment.step(1, 1)
    const first = galleryGsap.set.mock.calls.length
    await environment.step(1, 1)
    expect(galleryGsap.set.mock.calls.length).toBe(first)
    expect(first).toBeGreaterThanOrEqual(before)
    await environment.step(1, 20)
    expect(galleryGsap.set.mock.calls.length).toBeGreaterThan(first)
  })

  it("removes window listeners and inactivity timers but retains an active frame on unmount (quirk)", async () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const setup = await render({ continuousScroll: true })
    await ready(setup)
    wheel(setup)
    setup.wrapper.unmount()
    for (const type of ["focusin", "keydown", "pointerdown", "resize"])
      expect(remove).toHaveBeenCalledWith(type, expect.any(Function))
    expect(environment.frames.size).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(4000)
    expect(useMenu().pendingCallback.value).toBeNull()
  })
})
