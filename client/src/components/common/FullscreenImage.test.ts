import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import type { FullscreenShowOptions } from "#src/composables/useFullscreenImage"
import type { Image } from "#src/types/models"

import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useCollectionsStore } from "#src/stores/collections"
import { activatePinia, collection } from "#src/stores/test/helpers"
import {
  finishViewerAnimations,
  installViewerEnvironment,
  timelines,
  viewerFlip,
  viewerGsap,
  viewerPhotos,
  viewerTweens
} from "#src/test/fullscreenFixtures"
import { flushGallery, gallerySettings } from "#src/test/galleryFixtures"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/fullscreenFixtures")).viewerGsap }))
vi.mock("gsap/Flip", async () => ({
  Flip: (await import("#src/test/fullscreenFixtures")).viewerFlip
}))
vi.mock("#src/composables/useSettings", () => ({
  useSettings: () => ({ settings: gallerySettings })
}))
let pinia: Pinia
let environment: ReturnType<typeof installViewerEnvironment>
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  pinia = activatePinia()
  environment = installViewerEnvironment()
  gallerySettings.value = { capFrameRate: false, nativeScroll: true }
  const state = useFullscreenImage()
  state.isAnimating.value = false
  state.completeHide()
  useMenu().show(false)
  history.replaceState(
    { back: "/older", current: "/?columns=3", marker: "keep", position: 4 },
    "",
    "/?columns=3"
  )
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
const render = async ({ mobile = false, path = "/" } = {}) => {
  if (mobile) environment = installViewerEnvironment({ height: 844, touch: true, width: 390 })
  const photos = viewerPhotos()
  useCollectionsStore().collections = [
    {
      ...collection("album", [...photos, { ...photos[0], hidden: true, id: "hidden" }]),
      description: "A collection",
      title: "Album"
    }
  ]
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(FullscreenImage, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { Icon: true } }
  })
  await flushGallery()
  const state = useFullscreenImage()
  const open = async (photo: Image = photos[0], options: FullscreenShowOptions = {}) => {
    state.show(photo, options)
    await flushGallery()
  }
  return { open, photos, router, state, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const finish = async () => {
  await finishViewerAnimations()
  await vi.advanceTimersByTimeAsync(0)
  await flushGallery()
}
const key = async (key: string) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key })
  window.dispatchEvent(event)
  await flushGallery()
  return event
}
const thumbnail = (id: string) => {
  const card = document.createElement("div")
  card.dataset.flipId = `img-${id}`
  card.appendChild(document.createElement("img"))
  document.body.prepend(card)
  return card
}
const close = async (setup: Setup) => {
  await setup.wrapper.get(".top-left button").trigger("click")
  await flushGallery()
  await finish()
}
const drag = async (setup: Setup, delta: number, touch = false) => {
  const target = setup.wrapper.get(".fullscreen-image .image").element
  const event = (type: string, x: number) => {
    if (!touch) return new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x })
    const value = new TouchEvent(type, { bubbles: true, cancelable: true })
    Object.defineProperty(value, "touches", { value: [{ clientX: x }] })
    return value
  }
  target.dispatchEvent(event(touch ? "touchstart" : "mousedown", 350))
  target.dispatchEvent(event(touch ? "touchmove" : "mousemove", 350 - delta))
  await flushGallery()
  target.dispatchEvent(event(touch ? "touchend" : "mouseup", 350 - delta))
  await flushGallery()
}

describe("FullscreenImage", () => {
  it("starts hidden, registers Flip and leaves image rendering until an open request", async () => {
    const setup = await render()
    expect(setup.wrapper.find(".fullscreen-image-container").exists()).toBe(false)
    expect(viewerGsap.registerPlugin).toHaveBeenCalledWith(viewerFlip)
    expect(viewerGsap.ticker.fps).not.toHaveBeenCalled()
  })

  it("opens a loose image regularly, hides the menu and pushes exact preserved history state", async () => {
    const setup = await render()
    const push = vi.spyOn(history, "pushState")
    await setup.open({ ...setup.photos[0], collectionId: null })
    expect(setup.state.isAnimating.value).toBe(true)
    expect(viewerFlip.getState).not.toHaveBeenCalled()
    await finish()
    expect(setup.state.isAnimating.value).toBe(false)
    expect(setup.wrapper.get<HTMLImageElement>(".fullscreen-image .image").element.src).toContain(
      "/regular/photo-0"
    )
    expect(setup.wrapper.find(".nav-arrow").exists()).toBe(false)
    expect(setup.wrapper.find(".collection-images").exists()).toBe(false)
    expect(setup.wrapper.get(".image-metadata").text()).toContain("Test camera")
    expect(useMenu().isVisible.value).toBe(false)
    expect(push).toHaveBeenCalledWith(
      {
        back: "/?columns=3",
        current: "/images/photo-0",
        forward: null,
        marker: "keep",
        position: 5,
        replaced: false,
        scroll: null
      },
      "",
      "/images/photo-0"
    )
  })

  it("zooms from the card and calls position/return protocols once before zooming back", async () => {
    const setup = await render()
    const card = thumbnail("photo-0")
    const updatePositions = vi.fn()
    const visible = vi.fn(() => true)
    const onReturn = vi.fn(() => useMenu().show(false))
    await setup.open(setup.photos[0], {
      flipId: "img-photo-0",
      isThumbnailVisible: visible,
      onReturn,
      queryParams: "?columns=3",
      updatePositions
    })
    expect(viewerFlip.getState).toHaveBeenCalledWith([
      card,
      setup.wrapper.get(".fullscreen-image").element
    ])
    expect(viewerFlip.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 0.5, ease: "power2.inOut", paused: true, scale: true })
    )
    expect(card.style.visibility).toBe("hidden")
    await finish()
    await close(setup)
    expect(updatePositions).toHaveBeenCalledOnce()
    expect(onReturn).toHaveBeenCalledExactlyOnceWith(true, false, 0.5)
    expect(visible).toHaveBeenCalled()
    expect(card.style.visibility).toBe("visible")
    expect(setup.state.imageData.value).toBeNull()
    expect(useMenu().isVisible.value).toBe(true)
    expect(location.pathname + location.search).toBe("/?columns=3")
  })

  it.each([false, true])(
    "falls back to regular animation for a missing or invisible thumbnail: invisible %s",
    async (invisible) => {
      const setup = await render()
      if (invisible) thumbnail("photo-0")
      const onReturn = vi.fn()
      await setup.open(setup.photos[0], {
        flipId: "img-photo-0",
        isThumbnailVisible: () => false,
        onReturn
      })
      await finish()
      expect(viewerFlip.getState).not.toHaveBeenCalled()
      await close(setup)
      expect(onReturn).toHaveBeenCalledExactlyOnceWith(false, false, undefined)
    }
  )

  it("renders only visible collection images and reveals the strip and collection text", async () => {
    const setup = await render()
    await setup.open()
    await finish()
    expect(setup.wrapper.findAll(".thumbnail-item")).toHaveLength(3)
    expect(setup.wrapper.findAll(".nav-arrow")).toHaveLength(2)
    await setup.wrapper.get(".fullscreen-image .image").trigger("click")
    await finish()
    expect(setup.wrapper.get<HTMLDivElement>(".collection-images").element.style.visibility).toBe(
      "visible"
    )
    expect(setup.wrapper.get(".collection-title").text()).toBe("Album")
    expect(setup.wrapper.get(".collection-description").text()).toBe("A collection")
  })

  it.each([
    [2, ".nav-arrow-right", 0],
    [0, ".nav-arrow-left", 2]
  ])("wraps at collection ends from index %s", async (index, selector, next) => {
    const setup = await render()
    await setup.open(setup.photos[index])
    await finish()
    const replace = vi.spyOn(history, "replaceState")
    await setup.wrapper.get(selector).trigger("click")
    await finish()
    expect(setup.state.imageData.value?.id).toBe(setup.photos[next].id)
    expect(replace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        current: `/images/${setup.photos[next].id}`,
        marker: "keep",
        position: 5,
        replaced: true
      }),
      "",
      `/images/${setup.photos[next].id}`
    )
  })

  it.each(["ArrowDown", "ArrowUp"])("toggles the collection with %s", async (value) => {
    const setup = await render()
    await setup.open()
    await finish()
    expect((await key(value)).defaultPrevented).toBe(true)
    await finish()
    expect(setup.wrapper.get<HTMLDivElement>(".collection-images").element.style.visibility).toBe(
      "visible"
    )
    await key(value)
    await finish()
    expect(setup.wrapper.get<HTMLDivElement>(".collection-images").element.style.visibility).toBe(
      "hidden"
    )
  })

  it.each(["Enter", "i", "I"])("toggles metadata with %s", async (value) => {
    const setup = await render()
    await setup.open()
    await finish()
    expect((await key(value)).defaultPrevented).toBe(true)
    await finish()
    expect(setup.wrapper.get(".top-right button").classes()).toContain("active")
    await key(value)
    await finish()
    expect(setup.wrapper.get(".top-right button").classes()).not.toContain("active")
  })

  it("navigates with left/right keys and reports a different-image return without a flip target", async () => {
    const setup = await render()
    thumbnail("photo-0")
    const onReturn = vi.fn()
    await setup.open(setup.photos[0], {
      flipId: "img-photo-0",
      isThumbnailVisible: () => true,
      onReturn
    })
    await finish()
    await key("ArrowRight")
    await finish()
    expect(setup.state.imageData.value?.id).toBe("photo-1")
    expect(setup.state.flipId.value).toBeNull()
    await close(setup)
    expect(onReturn).toHaveBeenCalledExactlyOnceWith(false, true, undefined)
  })

  it("restores the original flip id and unchanged return flag when navigating back", async () => {
    const setup = await render()
    thumbnail("photo-0")
    const onReturn = vi.fn()
    await setup.open(setup.photos[0], {
      flipId: "img-photo-0",
      isThumbnailVisible: () => true,
      onReturn
    })
    await finish()
    await key("ArrowRight")
    await finish()
    await key("ArrowLeft")
    await finish()
    expect(setup.state.flipId.value).toBe("img-photo-0")
    await key("Escape")
    await finish()
    expect(onReturn).toHaveBeenCalledExactlyOnceWith(true, false, 0.5)
  })

  it.each([false, true])(
    "uses real drag navigation to snap back or commit: touch %s",
    async (touch) => {
      const setup = await render({ mobile: touch })
      await setup.open()
      await finish()
      await drag(setup, (window.innerWidth / 1.5) * 0.05, touch)
      expect(timelines.at(-1)?.reverse).toHaveBeenCalledOnce()
      await finish()
      expect(setup.state.imageData.value?.id).toBe("photo-0")
      await drag(setup, (window.innerWidth / 1.5) * 0.3, touch)
      expect(timelines.at(-1)?.play).toHaveBeenCalledOnce()
      await finish()
      expect(setup.state.imageData.value?.id).toBe("photo-1")
    }
  )

  it.each([false, true])(
    "opens and closes metadata in the matching layout: mobile %s",
    async (mobile) => {
      const setup = await render({ mobile })
      await setup.open()
      await finish()
      await setup.wrapper.get(".top-right button").trigger("click")
      await finish()
      expect(setup.wrapper.get<HTMLDivElement>(".image-metadata").element.style.visibility).toBe(
        "visible"
      )
      if (mobile) {
        expect(setup.wrapper.get(".metadata-overlay").classes()).toContain("active")
        await setup.wrapper.get(".metadata-overlay").trigger("click")
      } else await setup.wrapper.get(".top-right button").trigger("click")
      await finish()
      expect(setup.wrapper.get<HTMLDivElement>(".image-metadata").element.style.visibility).toBe(
        "hidden"
      )
    }
  )

  it("recomputes constraints on resize and wires the touch frame-rate cap", async () => {
    gallerySettings.value.capFrameRate = true
    const setup = await render({ mobile: true })
    await setup.open()
    await finish()
    expect(viewerGsap.ticker.fps).toHaveBeenCalledWith(75)
    await environment.resize(800, 600)
    expect(
      parseFloat(setup.wrapper.get<HTMLImageElement>(".image").element.style.width)
    ).toBeLessThanOrEqual(800)
    expect(setup.state.imageData.value?.id).toBe("photo-0")
  })

  it("closes once on popstate, preserves query params and removes its popstate listener", async () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const setup = await render()
    const onReturn = vi.fn()
    await setup.open(setup.photos[0], { onReturn, queryParams: "?columns=3" })
    await finish()
    window.dispatchEvent(new PopStateEvent("popstate"))
    await flushGallery()
    await finish()
    expect(onReturn).toHaveBeenCalledExactlyOnceWith(false, false, undefined)
    expect(remove).toHaveBeenCalledWith("popstate", expect.any(Function))
    expect(location.pathname + location.search).toBe("/?columns=3")
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(onReturn).toHaveBeenCalledOnce()
  })

  it("uses router replace/push for a direct-route image without manual history writes", async () => {
    const setup = await render({ path: "/images/photo-0" })
    const replace = vi.spyOn(setup.router, "replace")
    const push = vi.spyOn(setup.router, "push")
    const historyPush = vi.spyOn(history, "pushState")
    await setup.open(setup.photos[0], { queryParams: "?source=direct", updateRoute: false })
    await finish()
    expect(historyPush).not.toHaveBeenCalled()
    await key("ArrowRight")
    await finish()
    expect(replace).toHaveBeenCalledWith("/images/photo-1")
    await close(setup)
    expect(push).toHaveBeenCalledWith("/?source=direct")
  })

  it.each([null, true, "abc", { position: "bad" }])(
    "preserves the spread semantics of history state %j",
    async (state) => {
      const setup = await render()
      history.replaceState(state, "", "/")
      await setup.open({ ...setup.photos[0], collectionId: null })
      expect(history.state).toMatchObject({
        back: null,
        current: "/images/photo-0",
        position: 1,
        replaced: false
      })
      if (typeof state === "string") expect(history.state).toMatchObject({ 0: "a", 1: "b", 2: "c" })
    }
  )

  it("does not reverse an opening timeline because hide sets its processing flag first (quirk)", async () => {
    const setup = await render()
    thumbnail("photo-0")
    await setup.open(setup.photos[0], { flipId: "img-photo-0", isThumbnailVisible: () => true })
    const opening = timelines[0]
    await setup.wrapper.get(".top-left button").trigger("click")
    await flushGallery()
    expect(opening?.reverse).not.toHaveBeenCalled()
    expect(viewerFlip.from).toHaveBeenCalledTimes(2)
    await finish()
  })

  it("prevents Escape even while no image is open (quirk)", async () => {
    await render()
    expect((await key("Escape")).defaultPrevented).toBe(true)
  })

  it("removes listeners/observers but leaves animations, image state and controls timer on unmount (quirk)", async () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const setup = await render()
    await setup.open()
    setup.wrapper.unmount()
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function))
    expect(
      environment.resizeObservers.every((observer) => observer.disconnect.mock.calls.length > 0)
    ).toBe(true)
    expect(timelines.every((timeline) => timeline.kill.mock.calls.length === 0)).toBe(true)
    expect(viewerTweens.every((tween) => tween.kill.mock.calls.length === 0)).toBe(true)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    expect(setup.state.imageData.value).not.toBeNull()
  })
})
