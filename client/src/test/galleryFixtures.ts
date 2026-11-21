import type { gsap } from "gsap"

import { vi } from "vitest"
import { nextTick, ref } from "vue"

import type { FullscreenShowOptions } from "#src/composables/useFullscreenImage"
import type { Image, ImageVersionType } from "#src/types/models"

import { gridImage } from "#src/test/gridFixtures"

export const gallerySettings = ref({ capFrameRate: false, nativeScroll: true })
export const fullscreenShow =
  vi.fn<(image: Image | null, options?: FullscreenShowOptions) => void>()
export const registerGallery = vi.fn()

export const galleryImages = (count = 12) =>
  Array.from({ length: count }, (_, index) => {
    const id = `photo-${index}`
    const version = (type: ImageVersionType) => ({
      height: 100,
      path: `/${type}/${id}`,
      size: 100,
      storageType: "local" as const,
      type,
      width: 100
    })
    return {
      ...gridImage(id),
      versions: [version("tiny"), version("thumbnail"), version("regular")]
    }
  })

const positions = new WeakMap<Element, { scale: number; y: number }>()
const apply = (target: unknown, vars: gsap.TweenVars) => {
  if (Array.isArray(target)) {
    target.forEach((item: unknown) => apply(item, vars))
    return
  }
  if (!(target instanceof HTMLElement)) return
  const position = positions.get(target) ?? { scale: 1, y: 0 }
  if (typeof vars.y === "number") position.y = vars.y
  if (typeof vars.scale === "number") position.scale = vars.scale
  positions.set(target, position)
  target.style.transform = `translateY(${position.y}px) scale(${position.scale})`
  if (vars.opacity !== undefined) target.style.opacity = String(vars.opacity)
  if (typeof vars.visibility === "string") target.style.visibility = vars.visibility
}
interface TweenControl {
  kill: ReturnType<typeof vi.fn<() => void>>
  target: unknown
  vars: Parameters<typeof gsap.to>[1]
}
export const tweens: TweenControl[] = []
export const galleryGsap = {
  quickSetter: vi.fn(
    (target: Element, property: string) => (value: number) => apply(target, { [property]: value })
  ),
  set: vi.fn(apply),
  ticker: { fps: vi.fn() },
  to: vi.fn((target: unknown, vars: gsap.TweenVars) => {
    const tween = { kill: vi.fn(), target, vars }
    tweens.push(tween)
    return tween
  }),
  utils: {
    shuffle: <T>(values: T[]) => values,
    wrap: (min: number, max: number, value: number) =>
      ((((value - min) % (max - min)) + max - min) % (max - min)) + min
  }
}
export const finishTweens = () => {
  for (const tween of tweens.splice(0)) {
    if (tween.kill.mock.calls.length) continue
    apply(tween.target, tween.vars)
    tween.vars.onComplete?.()
  }
}
export const yPosition = (element: Element) => positions.get(element)?.y ?? 0
export const flushGallery = async () => {
  for (let index = 0; index < 8; index++) await nextTick()
}

export const installGalleryEnvironment = ({ height = 800, touch = false, width = 1280 } = {}) => {
  let now = 1000
  let nextId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal("innerWidth", width)
  vi.stubGlobal("innerHeight", height)
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextId, callback)
      return nextId
    })
  )
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => frames.delete(id))
  )
  vi.spyOn(performance, "now").mockImplementation(() => now)
  vi.stubGlobal(
    "matchMedia",
    vi.fn((media: string) =>
      Object.assign(new EventTarget(), { matches: media === "(pointer: coarse)" && touch, media })
    )
  )
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement
  ) {
    const card = this.closest(".image-card")
    if (card) {
      const column = card.parentElement
      const index = column ? [...column.children].indexOf(card) : 0
      const top = card.classList.contains("native-layout") ? index * 120 : yPosition(card)
      return new DOMRect(20, top, 100, 100)
    }
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  })
  class TestResizeObserver implements ResizeObserver {
    disconnect = vi.fn()
    observe = vi.fn()
    unobserve = vi.fn()
  }
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  const observers: TestIntersectionObserver[] = []
  class TestIntersectionObserver implements IntersectionObserver {
    callback: IntersectionObserverCallback
    disconnect = vi.fn()
    elements = new Set<Element>()
    observe = vi.fn((element: Element) => this.elements.add(element))
    root: Document | Element | null
    rootMargin: string
    scrollMargin = "0px"
    thresholds = [0]
    unobserve = vi.fn((element: Element) => this.elements.delete(element))
    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
      this.callback = callback
      this.root = options.root ?? null
      this.rootMargin = options.rootMargin ?? "0px"
      observers.push(this)
    }
    emit = (visible = true) => {
      this.callback(
        [...this.elements].map((target) => ({
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: visible ? 1 : 0,
          intersectionRect: target.getBoundingClientRect(),
          isIntersecting: visible,
          rootBounds: null,
          target,
          time: now
        })),
        this
      )
    }
    takeRecords = () => []
  }
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  const step = async (count = 1, elapsed = 50) => {
    for (let index = 0; index < count; index++) {
      now += elapsed
      await vi.advanceTimersByTimeAsync(elapsed)
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(now)
      await flushGallery()
    }
  }
  const resize = async (newWidth: number, newHeight = height) => {
    window.innerWidth = newWidth
    window.innerHeight = newHeight
    window.dispatchEvent(new Event("resize"))
    await flushGallery()
  }
  return { frames, observers, resize, step }
}

export const loadGalleryImages = async (root: Element) => {
  root
    .querySelectorAll(".tiny-fallback, .thumbnail")
    .forEach((element) => element.dispatchEvent(new Event("load")))
  await flushGallery()
}
