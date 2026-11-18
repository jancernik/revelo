import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  finishViewerAnimations,
  installViewerEnvironment,
  viewerGsap,
  viewerPhotos,
  viewerTweens
} from "#src/test/fullscreenFixtures"

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  installViewerEnvironment()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("fullscreen fixtures", () => {
  it("creates a collection with metadata on its first and last images", () => {
    const images = viewerPhotos()
    expect(images.map(({ camera, collectionId, id }) => ({ camera, collectionId, id }))).toEqual([
      { camera: "Test camera", collectionId: "album", id: "photo-0" },
      { camera: null, collectionId: "album", id: "photo-1" },
      { camera: "Test camera", collectionId: "album", id: "photo-2" }
    ])
    images[0].camera = "changed"
    expect(viewerPhotos()[0].camera).toBe("Test camera")
  })

  it("keeps paused timelines pending and applies their final state after play", async () => {
    const element = document.createElement("div")
    const progress: number[] = []
    const complete = vi.fn()
    const timeline = viewerGsap.timeline({
      onComplete: complete,
      onUpdate: () => progress.push(timeline.progress()),
      paused: true
    })
    timeline.fromTo(element, { opacity: 0 }, { opacity: 1, width: 240, x: "50%", y: 30 })
    timeline.progress(0.4)
    await finishViewerAnimations()
    expect(progress).toEqual([0.4])
    expect(element.style.opacity).toBe("0")
    expect(complete).not.toHaveBeenCalled()
    timeline.play()
    await finishViewerAnimations()
    expect(progress).toEqual([0.4, 1])
    expect(element.style.opacity).toBe("1")
    expect(element.style.width).toBe("240px")
    expect(element.style.transform).toBe("translate(50%, 30px)")
    expect(complete).toHaveBeenCalledOnce()
    expect(timeline.done).toBe(true)
  })

  it("finishes a reverse with its reverse callback and zero progress", async () => {
    const complete = vi.fn()
    const reverseComplete = vi.fn()
    const timeline = viewerGsap.timeline({
      onComplete: complete,
      onReverseComplete: reverseComplete
    })
    timeline.progress(0.6).reverse()
    await finishViewerAnimations()
    expect(timeline.progress()).toBe(0)
    expect(reverseComplete).toHaveBeenCalledOnce()
    expect(complete).not.toHaveBeenCalled()
  })

  it("does not apply or complete killed timelines and tweens", async () => {
    const element = document.createElement("div")
    const complete = vi.fn()
    viewerGsap.timeline({ onComplete: complete }).to(element, { opacity: 1 }).kill()
    viewerGsap.to(element, { onComplete: complete, width: 400 }).kill()
    await finishViewerAnimations()
    expect(element.style.opacity).toBe("")
    expect(element.style.width).toBe("")
    expect(complete).not.toHaveBeenCalled()
  })

  it("drains animations queued by completion callbacks without repeating finished work", async () => {
    const element = document.createElement("div")
    const complete = vi.fn()
    viewerGsap.to(element, {
      onComplete: () => {
        viewerGsap.to(element, { onComplete: complete, opacity: 1 })
      },
      opacity: 0
    })
    await finishViewerAnimations()
    await finishViewerAnimations()
    expect(element.style.opacity).toBe("1")
    expect(complete).toHaveBeenCalledOnce()
    expect(viewerTweens).toHaveLength(2)
    expect(viewerTweens.every(({ done }) => done)).toBe(true)
  })

  it("provides centered viewer, gallery-card and panel measurements", () => {
    const viewer = document.createElement("div")
    viewer.className = "fullscreen-image"
    const image = document.createElement("img")
    image.className = "image"
    image.style.width = "400px"
    image.style.height = "200px"
    viewer.append(image)
    expect(viewer.getBoundingClientRect()).toMatchObject({
      height: 200,
      width: 400,
      x: 440,
      y: 300
    })
    const card = document.createElement("div")
    card.className = "image-card"
    card.append(viewer)
    expect(image.getBoundingClientRect()).toMatchObject({ height: 100, width: 100, x: 20, y: 100 })
    const panel = document.createElement("div")
    panel.className = "image-metadata"
    expect([panel.offsetWidth, panel.offsetHeight]).toEqual([240, 320])
    panel.className = "collection-images"
    expect(panel.offsetHeight).toBe(82)
    panel.className = "title-description"
    expect(panel.offsetHeight).toBe(56)
    expect([image.complete, image.naturalWidth, image.naturalHeight]).toEqual([true, 100, 100])
  })

  it("updates the viewport and emits captured resize observers", async () => {
    const environment = installViewerEnvironment({ height: 844, touch: true, width: 390 })
    const resize = vi.fn<ResizeObserverCallback>()
    const observer = new ResizeObserver(resize)
    observer.observe(document.createElement("div"))
    await environment.resize(600, 900)
    expect([window.innerWidth, window.innerHeight]).toEqual([600, 900])
    expect(resize).toHaveBeenCalledWith([], observer)
    expect(environment.resizeObservers).toHaveLength(1)
    expect(matchMedia("(pointer: coarse)").matches).toBe(true)
  })
})
