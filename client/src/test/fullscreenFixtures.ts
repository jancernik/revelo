import type { gsap } from "gsap"

import { vi } from "vitest"

import {
  flushGallery,
  galleryGsap,
  galleryImages,
  installGalleryEnvironment,
  yPosition
} from "#src/test/galleryFixtures"

interface AnimationAction {
  target: unknown
  vars: gsap.TweenVars
}
const apply = (target: unknown, vars: gsap.TweenVars) => {
  if (Array.isArray(target)) {
    target.forEach((item: unknown) => apply(item, vars))
    return
  }
  galleryGsap.set(target, vars)
  if (!(target instanceof HTMLElement)) return
  for (const key of [
    "borderRadius",
    "bottom",
    "display",
    "filter",
    "height",
    "left",
    "maxHeight",
    "maxWidth",
    "opacity",
    "position",
    "right",
    "top",
    "visibility",
    "width"
  ] as const) {
    const value: unknown = vars[key]
    if (typeof value === "string" || typeof value === "number")
      target.style[key] =
        typeof value === "number" && !["opacity"].includes(key) ? `${value}px` : String(value)
  }
  if (typeof vars.x === "number" || typeof vars.x === "string")
    target.dataset.testX = String(vars.x)
  const x = target.dataset.testX ?? "0"
  target.style.transform = `translate(${x.endsWith("%") ? x : `${x}px`}, ${yPosition(target)}px)`
}
interface TestTween {
  done: boolean
  kill: ReturnType<typeof vi.fn<() => void>>
  target: unknown
  vars: gsap.TweenVars
}
export class TestTimeline {
  actions: AnimationAction[] = []
  add = vi.fn(() => this)
  done = false
  kill = vi.fn(() => {
    this.done = true
    return this
  })
  options: NonNullable<Parameters<typeof gsap.timeline>[0]>
  playing: boolean
  paused = vi.fn((paused: boolean) => {
    this.playing = !paused
    return this
  })
  reversing = false
  play = vi.fn(() => {
    this.playing = true
    this.reversing = false
    return this
  })
  reverse = vi.fn(() => {
    this.playing = true
    this.reversing = true
    return this
  })
  timeScale = vi.fn(() => this)
  value = 0
  constructor(options: gsap.TimelineVars = {}) {
    this.options = options
    this.playing = !options.paused
  }
  duration = () => 0.5
  finish = async () => {
    this.done = true
    if (this.reversing) {
      this.value = 0
      await this.options.onReverseComplete?.call(this)
    } else {
      this.value = 1
      this.actions.forEach(({ target, vars }) => apply(target, vars))
      this.options.onUpdate?.call(this)
      await this.options.onComplete?.call(this)
    }
  }
  fromTo = (target: unknown, from: gsap.TweenVars, vars: gsap.TweenVars) => {
    apply(target, from)
    this.actions.push({ target, vars })
    return this
  }
  progress(): number
  progress(value: number): this
  progress(value?: number): number | this {
    if (value === undefined) return this.value
    this.value = value
    this.options.onUpdate?.call(this)
    return this
  }
  to = (target: unknown, vars: gsap.TweenVars) => {
    this.actions.push({ target, vars })
    return this
  }
}
export const timelines: TestTimeline[] = []
export const viewerTweens: TestTween[] = []
const to = vi.fn((target: unknown, vars: gsap.TweenVars) => {
  const tween: TestTween = {
    done: false,
    kill: vi.fn(() => {
      tween.done = true
    }),
    target,
    vars
  }
  viewerTweens.push(tween)
  return tween
})
export const viewerGsap = {
  ...galleryGsap,
  from: vi.fn((target: unknown, vars: gsap.TweenVars) => to(target, vars)),
  fromTo: vi.fn((target: unknown, from: gsap.TweenVars, vars: gsap.TweenVars) => {
    apply(target, from)
    return to(target, vars)
  }),
  killTweensOf: vi.fn(),
  registerPlugin: vi.fn(),
  set: vi.fn(apply),
  timeline: vi.fn((options: gsap.TimelineVars = {}) => {
    const value = new TestTimeline(options)
    timelines.push(value)
    return value
  }),
  to
}
export const viewerFlip = {
  from: vi.fn((_state: unknown, options: gsap.TimelineVars) => viewerGsap.timeline(options)),
  getState: vi.fn((targets: unknown) => ({ targets }))
}
export const finishViewerAnimations = async () => {
  for (let count = 0; count < 12; count++) {
    const pending = timelines.filter((timeline) => timeline.playing && !timeline.done)
    const tweens = viewerTweens.filter((tween) => !tween.done)
    if (!pending.length && !tweens.length) break
    for (const timeline of pending) await timeline.finish()
    for (const tween of tweens) {
      tween.done = true
      apply(tween.target, tween.vars)
      await tween.vars.onComplete?.()
    }
    await flushGallery()
  }
}
export const viewerPhotos = () =>
  galleryImages(3).map((image, index) => ({
    ...image,
    camera: index === 1 ? null : "Test camera",
    collectionId: "album"
  }))
export const installViewerEnvironment = ({ height = 800, touch = false, width = 1280 } = {}) => {
  timelines.length = 0
  viewerTweens.length = 0
  const environment = installGalleryEnvironment({ height, touch, width })
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(100)
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(100)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains("image-metadata") ? 240 : window.innerWidth
  })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains("image-metadata")
      ? 320
      : this.classList.contains("collection-images")
        ? 82
        : this.classList.contains("title-description")
          ? 56
          : window.innerHeight
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.closest(".image-card")) return new DOMRect(20, 100, 100, 100)
    const image = this.classList.contains("fullscreen-image")
      ? this.querySelector<HTMLImageElement>(".image")
      : this
    const width = parseFloat(image?.style.width ?? "") || 100
    const height = parseFloat(image?.style.height ?? "") || 100
    return new DOMRect(
      (window.innerWidth - width) / 2,
      (window.innerHeight - height) / 2,
      width,
      height
    )
  })
  const observers: TestResizeObserver[] = []
  class TestResizeObserver implements ResizeObserver {
    callback: ResizeObserverCallback
    disconnect = vi.fn()
    observe = vi.fn()
    unobserve = vi.fn()
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      observers.push(this)
    }
    emit = () => this.callback([], this)
  }
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  return {
    ...environment,
    resize: async (width: number, height = window.innerHeight) => {
      await environment.resize(width, height)
      observers.forEach((observer) => observer.emit())
      await flushGallery()
    },
    resizeObservers: observers
  }
}
