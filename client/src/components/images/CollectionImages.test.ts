import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import CollectionImages from "#src/components/images/CollectionImages.vue"
import { collection } from "#src/stores/test/helpers"
import { installViewerEnvironment } from "#src/test/fullscreenFixtures"
import { flushGallery, galleryImages } from "#src/test/galleryFixtures"

vi.mock("gsap", async () => ({ gsap: (await import("#src/test/fullscreenFixtures")).viewerGsap }))
let environment: ReturnType<typeof installViewerEnvironment>
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  environment = installViewerEnvironment()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})
const render = async (count = 3) => {
  const photos = galleryImages(count)
  const wrapper = mount(CollectionImages, {
    attachTo: document.body,
    props: { collection: collection("album", photos), currentImageId: "photo-0" }
  })
  await flushGallery()
  await environment.step(2)
  return { photos, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const x = (setup: Setup) => setup.wrapper.get<HTMLElement>(".thumbnail-item").element.dataset.testX
const mouse = async (setup: Setup, type: string, clientX: number) => {
  setup.wrapper.element.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX })
  )
  await flushGallery()
}

describe("CollectionImages", () => {
  it.each([
    [3, false],
    [30, true]
  ])(
    "renders %s thumbnails, active selection and its infinite-scroll class",
    async (count, infinite) => {
      const setup = await render(count)
      expect(setup.wrapper.findAll(".thumbnail-item")).toHaveLength(count)
      expect(setup.wrapper.get(".thumbnail-item.active img").attributes("src")).toBe(
        "/thumbnail/photo-0"
      )
      expect(setup.wrapper.classes().includes("infinite")).toBe(infinite)
      expect(setup.wrapper.vm.canInfiniteScroll).toBe(infinite)
      expect(setup.wrapper.vm.collectionImages).toBe(setup.wrapper.element)
    }
  )

  it("emits the original event and image when a thumbnail is clicked", async () => {
    const setup = await render()
    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    setup.wrapper.get(".thumbnail-item").element.dispatchEvent(event)
    expect(setup.wrapper.emitted("click")).toEqual([[event, setup.photos[0]]])
    expect(event.cancelBubble).toBe(false)
  })

  it("suppresses dragged clicks for 50ms and then accepts them", async () => {
    const setup = await render(30)
    await mouse(setup, "mousedown", 400)
    await environment.step(1)
    await mouse(setup, "mousemove", 350)
    await mouse(setup, "mouseup", 350)
    const blocked = new MouseEvent("click", { bubbles: true, cancelable: true })
    setup.wrapper.get(".thumbnail-item").element.dispatchEvent(blocked)
    expect(blocked.defaultPrevented).toBe(true)
    expect(setup.wrapper.emitted("click")).toBeUndefined()
    await vi.advanceTimersByTimeAsync(50)
    await setup.wrapper.get(".thumbnail-item").trigger("click")
    expect(setup.wrapper.emitted("click")).toHaveLength(1)
  })

  it("touch release emits a click but leaves root dragging set because propagation stops (quirk)", async () => {
    const setup = await render()
    const target = setup.wrapper.get(".thumbnail-item").element
    const start = new TouchEvent("touchstart", { bubbles: true, cancelable: true })
    Object.defineProperty(start, "touches", { value: [{ clientX: 100 }] })
    target.dispatchEvent(start)
    await flushGallery()
    const end = new TouchEvent("touchend", { bubbles: true, cancelable: true })
    target.dispatchEvent(end)
    await flushGallery()
    expect(setup.wrapper.emitted("click")).toEqual([[end, setup.photos[0]]])
    expect(setup.wrapper.classes()).toContain("dragging")
  })

  it("exposes bounded and animated scrolling, including missing ids", async () => {
    const setup = await render(30)
    const initial = x(setup)
    setup.wrapper.vm.scrollTo("missing", false)
    await environment.step(1)
    expect(x(setup)).toBe(initial)
    setup.wrapper.vm.scrollTo("photo-20", false)
    await environment.step(1)
    expect(x(setup)).not.toBe(initial)
    const jumped = x(setup)
    setup.wrapper.vm.scrollTo("photo-4", true)
    await environment.step(1)
    expect(x(setup)).not.toBe(jumped)
    await environment.step(100)
    expect(environment.frames.size).toBe(0)
  })

  it("handles the dominant wheel axis and decays inertia", async () => {
    const setup = await render(30)
    const initial = x(setup)
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
      deltaY: 5
    })
    setup.wrapper.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    await environment.step(2)
    expect(x(setup)).not.toBe(initial)
    await environment.step(100)
    expect(environment.frames.size).toBe(0)
  })

  it("recalculates finite layout when its observed width changes", async () => {
    const setup = await render(30)
    expect(setup.wrapper.vm.canInfiniteScroll).toBe(true)
    await environment.resize(5000)
    await environment.step(2)
    expect(setup.wrapper.vm.canInfiniteScroll).toBe(false)
    expect(setup.wrapper.classes()).not.toContain("infinite")
  })

  it("does not initialize replacement items while its boolean initialization guard stays true (quirk)", async () => {
    const setup = await render()
    expect(setup.wrapper.get<HTMLElement>(".thumbnail-item").element.style.position).toBe(
      "absolute"
    )
    await setup.wrapper.setProps({
      collection: collection(
        "other",
        setup.photos.map((photo) => ({ ...photo, id: `new-${photo.id}` }))
      )
    })
    await flushGallery()
    expect(setup.wrapper.get<HTMLElement>(".thumbnail-item").element.style.position).toBe("")
  })

  it("disconnects observation but leaves an active render frame and drag timer on unmount (quirk)", async () => {
    const setup = await render(30)
    await mouse(setup, "mousedown", 400)
    await environment.step(1)
    await mouse(setup, "mousemove", 350)
    await mouse(setup, "mouseup", 350)
    setup.wrapper.unmount()
    expect(
      environment.resizeObservers.every((observer) => observer.disconnect.mock.calls.length > 0)
    ).toBe(true)
    expect(environment.frames.size).toBeGreaterThan(0)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
  })
})
