import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  finishTweens,
  galleryGsap,
  galleryImages,
  installGalleryEnvironment,
  loadGalleryImages,
  tweens,
  yPosition
} from "#src/test/galleryFixtures"

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  tweens.length = 0
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("gallery fixtures", () => {
  it("creates independent images and their tiny, thumbnail and regular versions", () => {
    const images = galleryImages()
    expect(images).toHaveLength(12)
    expect(images[0].id).toBe("photo-0")
    expect(images[0].versions?.map(({ path, type }) => ({ path, type }))).toEqual([
      { path: "/tiny/photo-0", type: "tiny" },
      { path: "/thumbnail/photo-0", type: "thumbnail" },
      { path: "/regular/photo-0", type: "regular" }
    ])
    images[0].id = "changed"
    expect(galleryImages(1)[0].id).toBe("photo-0")
    expect(galleryImages(0)).toEqual([])
  })

  it("applies nested targets and ignores values that are not HTML elements", () => {
    const first = document.createElement("div")
    const second = document.createElement("div")
    galleryGsap.set([first, [second, null, "missing"]], {
      opacity: 0,
      scale: 2,
      visibility: "hidden",
      y: 24
    })
    for (const element of [first, second]) {
      expect(yPosition(element)).toBe(24)
      expect(element.style.transform).toBe("translateY(24px) scale(2)")
      expect(element.style.opacity).toBe("0")
      expect(element.style.visibility).toBe("hidden")
    }
  })

  it("keeps the other position fields when a quick setter updates one field", () => {
    const element = document.createElement("div")
    galleryGsap.set(element, { scale: 0.5, y: 10 })
    galleryGsap.quickSetter(element, "y")(32)
    expect(yPosition(element)).toBe(32)
    expect(element.style.transform).toBe("translateY(32px) scale(0.5)")
  })

  it("finishes queued tweens once and skips killed tweens", () => {
    const element = document.createElement("div")
    const complete = vi.fn()
    const killedComplete = vi.fn()
    galleryGsap.to(element, { onComplete: complete, y: 50 })
    galleryGsap.to(element, { onComplete: killedComplete, y: 100 }).kill()
    expect(yPosition(element)).toBe(0)
    finishTweens()
    finishTweens()
    expect(yPosition(element)).toBe(50)
    expect(complete).toHaveBeenCalledOnce()
    expect(killedComplete).not.toHaveBeenCalled()
    expect(tweens).toHaveLength(0)
  })

  it("advances timers before frames and defers newly scheduled frames to the next step", async () => {
    const environment = installGalleryEnvironment()
    const calls: string[] = []
    const canceled = vi.fn()
    setTimeout(() => calls.push("timer"), 10)
    requestAnimationFrame((timestamp) => {
      calls.push(`frame:${timestamp}`)
      requestAnimationFrame(() => calls.push("next"))
    })
    cancelAnimationFrame(requestAnimationFrame(canceled))
    await environment.step(1, 16)
    expect(calls).toEqual(["timer", "frame:1016"])
    expect(performance.now()).toBe(1016)
    await environment.step(1, 16)
    expect(calls).toEqual(["timer", "frame:1016", "next"])
    expect(canceled).not.toHaveBeenCalled()
    expect(environment.frames.size).toBe(0)
    await environment.resize(390, 844)
    expect(document.createElement("div").getBoundingClientRect().width).toBe(390)
    expect(window.innerHeight).toBe(844)
  })

  it("emits intersections only for observed elements with the requested visibility", () => {
    const environment = installGalleryEnvironment({ touch: true })
    const root = document.createElement("div")
    const first = document.createElement("div")
    const second = document.createElement("div")
    const callback = vi.fn<IntersectionObserverCallback>()
    const observer = new IntersectionObserver(callback, { root, rootMargin: "25px" })
    observer.observe(first)
    observer.observe(second)
    observer.unobserve(second)
    environment.observers[0]?.emit(false)
    expect(callback).toHaveBeenCalledOnce()
    const entries = callback.mock.calls[0]?.[0]
    expect(entries?.map(({ isIntersecting, target }) => ({ isIntersecting, target }))).toEqual([
      { isIntersecting: false, target: first }
    ])
    expect(observer.root).toBe(root)
    expect(observer.rootMargin).toBe("25px")
    expect(matchMedia("(pointer: coarse)").matches).toBe(true)
  })

  it("dispatches load events for gallery image layers only", async () => {
    const root = document.createElement("div")
    const calls: string[] = []
    for (const name of ["tiny-fallback", "thumbnail", "unrelated"]) {
      const image = document.createElement("img")
      image.className = name
      image.addEventListener("load", () => calls.push(name))
      root.append(image)
    }
    await loadGalleryImages(root)
    expect(calls).toEqual(["tiny-fallback", "thumbnail"])
  })
})
