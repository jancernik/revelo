import type { Renderer, SlideSource } from "./render/types"
import type { Axis, DeepPartial, Direction, Neighbor, PagerFrame, Phase, Size } from "./types"

import { mergeConfig, PAGER_DEFAULTS, type PagerConfig, REDUCED_MOTION } from "./config"
import { createFlow, type Flow } from "./flow"
import { bindKeyboard, bindPointer, bindWheel } from "./gesture"
import { createHaptics, type Haptics, silentHaptics } from "./haptics"
import { PagerModel } from "./model"

export interface EngineOptions {
  /** Axes a swipe moves along; the first is the main one. */
  axes?: Axis[]
  config?: DeepPartial<PagerConfig>
  /** Overrides the haptics the config would pick. The caller owns their disposal. */
  haptics?: Haptics
  index?: number
  /** Element whose arrow and page keys step the pager; the window by default. */
  keys?: HTMLElement
  /** Where a step leads. Adjacent indices within the slides by default. */
  neighbor?: Neighbor
  onIndex?: (index: number) => void
  onPhase?: (phase: Phase) => void
  renderer: Renderer
  slides: SlideSource
}

/** Longest frame step, in seconds, so a paused tab does not leap. */
const MAX_FRAME = 0.05

/** Wires input, motion and drawing on a canvas, and runs the frame loop. */
export class PagerEngine {
  /** The last frame drawn. */
  get frame(): null | PagerFrame {
    return this.last
  }
  get index(): number {
    return this.model.index
  }
  private config: PagerConfig
  private count: number
  private disposed = false
  private flow: Flow
  private haptics: Haptics
  private last: null | PagerFrame = null
  private lastTime = 0
  private media: MediaQueryList | null = null
  private model: PagerModel
  private observer: null | ResizeObserver = null
  private phase: Phase = "idle"
  private raf = 0
  private time = 0

  private unbind: (() => void)[] = []

  private viewport: Size = { height: 1, width: 1 }

  constructor(
    private canvas: HTMLCanvasElement,
    private options: EngineOptions
  ) {
    if (typeof matchMedia === "function") {
      this.media = matchMedia("(prefers-reduced-motion: reduce)")
      this.media.addEventListener("change", this.onMediaChange)
    }
    this.config = this.resolveConfig()
    this.count = options.slides.count
    this.haptics = options.haptics ?? this.pickHaptics()
    this.model = new PagerModel({
      axes: options.axes ?? ["y"],
      config: this.config,
      neighbor: (index, axis, direction) => {
        const next = (this.options.neighbor ?? this.adjacent)(index, axis, direction)
        return next !== null && this.validIndex(next) ? next : null
      },
      onCommit: () => {
        if (!this.disposed) this.haptics.tick()
      },
      onIndex: (index) => {
        if (!this.disposed) this.options.onIndex?.(index)
      },
      span: (axis) => (axis === "y" ? this.viewport.height : this.viewport.width)
    })
    this.flow = createFlow(this.config.flow)

    const step = (axis: Axis, direction: Direction) =>
      this.step(this.model.resolveAxis(axis), direction)
    this.unbind.push(
      bindPointer(
        canvas,
        {
          onDrag: (distance, point, time) => {
            this.model.move(distance, point, time)
            this.redraw()
          },
          onGrab: (point, time) => {
            this.model.grab(point, time)
            this.redraw()
          },
          onLock: (axis) => this.model.lock(axis),
          onRelease: (_point, time) => {
            this.model.release(time)
            this.redraw()
          }
        },
        () => this.config.gesture
      ),
      bindKeyboard(options.keys ?? window, step),
      bindWheel(canvas, step)
    )

    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.resize())
      this.observer.observe(canvas)
    }
    this.resize()
    this.model.setIndex(this.boundedIndex(options.index ?? 0))
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    if (!this.options.haptics) this.haptics.dispose?.()
    this.observer?.disconnect()
    this.media?.removeEventListener("change", this.onMediaChange)
    for (const unbind of this.unbind) unbind()
    this.unbind = []
  }

  goTo(index: number): void {
    if (this.validIndex(index) && this.model.goTo(index)) this.redraw()
  }

  /** Draws a frame when the next one is due. Call after content changes. */
  redraw(): void {
    if (!this.disposed && !this.raf) this.raf = requestAnimationFrame(this.tick)
  }

  setAxes(axes: Axis[]): void {
    this.model.setAxes(axes)
  }

  setConfig(config?: DeepPartial<PagerConfig>): void {
    this.options.config = config
    this.config = this.resolveConfig()
    this.model.setConfig(this.config)
    this.flow.configure(this.config.flow)
    if (!this.options.haptics) {
      this.haptics.dispose?.()
      this.haptics = this.pickHaptics()
    }
    this.redraw()
  }

  /** Shows an item at once, without a transition. */
  setIndex(index: number): void {
    if (!Number.isInteger(index)) return
    this.model.setIndex(this.boundedIndex(index))
    this.flow.reset(0)
    this.redraw()
  }

  setNeighbor(neighbor?: Neighbor): void {
    this.options.neighbor = neighbor
    this.reconcileSlides()
    this.redraw()
  }

  setSlides(slides: SlideSource): void {
    this.options.slides = slides
    this.reconcileSlides()
    this.redraw()
  }

  step(axis: Axis, direction: Direction): void {
    if (this.model.step(axis, direction)) this.redraw()
  }

  private adjacent: Neighbor = (index, _axis, direction) => {
    const next = index + direction
    return next >= 0 && next < this.options.slides.count ? next : null
  }

  private boundedIndex(index: number): number {
    if (this.options.slides.count === 0) return -1
    return Math.max(0, Math.min(this.options.slides.count - 1, Number.isInteger(index) ? index : 0))
  }

  private onMediaChange = () => this.setConfig(this.options.config)

  private pickHaptics(): Haptics {
    return this.config.haptics ? createHaptics() : silentHaptics
  }

  private reconcileSlides(): void {
    this.count = this.options.slides.count
    const index = this.boundedIndex(this.model.index)
    const to = this.model.to
    if (index !== this.model.index || (to !== null && !this.validIndex(to))) {
      this.model.setIndex(index)
      this.flow.reset(0)
    }
    this.model.reconcile()
  }

  private resize(): void {
    if (this.disposed) return
    const rect = this.canvas.getBoundingClientRect()
    this.viewport = {
      height: Math.max(1, Math.round(rect.height)),
      width: Math.max(1, Math.round(rect.width))
    }
    const { height, width } = this.viewport
    this.options.renderer.resize(width, height, window.devicePixelRatio || 1)
    // Resizing clears the drawing buffer, which would paint before the next animation frame.
    if (this.last) this.options.renderer.render(this.last, this.options.slides)
    this.redraw()
  }

  private resolveConfig(): PagerConfig {
    const config = mergeConfig(PAGER_DEFAULTS, this.options.config)
    const reduce = config.reducedMotion && this.media?.matches
    return reduce ? mergeConfig(config, REDUCED_MOTION) : config
  }

  private tick = (now: number) => {
    this.raf = 0
    if (this.count !== this.options.slides.count) this.reconcileSlides()
    if (this.disposed) return
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, MAX_FRAME) : 1 / 60
    this.lastTime = now
    this.time += dt

    const model = this.model
    const moving = model.update(dt, now)
    if (this.disposed) return
    const { height, width } = this.viewport
    const { touch } = model
    const across = touch ? (model.axis === "y" ? touch.x / width : touch.y / height) : 0.5
    const flowing = this.flow.update(model.progress, model.smoothVelocity, across, dt)

    const frame: PagerFrame = { ...model.frame(), flow: this.flow.state, time: this.time }
    this.last = frame
    this.options.renderer.render(frame, this.options.slides)
    if (frame.phase !== this.phase) {
      this.phase = frame.phase
      this.options.onPhase?.(frame.phase)
    }

    if (moving || flowing || model.active) this.redraw()
    else this.lastTime = 0
  }

  private validIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.options.slides.count
  }
}
