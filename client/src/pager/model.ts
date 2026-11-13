import type { PagerConfig } from "./config"
import type { Axis, Direction, Neighbor, PagerFrame, Phase, Point } from "./types"

import { createFollow, type Follow, offsetFollow } from "./follow"
import { clamp, type Sample, springStep, trailingVelocity } from "./math"
import { settleStep } from "./motion"

export interface ModelOptions {
  axes: Axis[]
  config: PagerConfig
  neighbor: Neighbor
  /** A step is committed: it landed, or a release or input chose it. */
  onCommit?: () => void
  onIndex?: (index: number) => void
  /** Screen length along an axis, in pixels. */
  span: (axis: Axis) => number
}

interface Drag {
  axis: Axis | null
  /** Finger travel along the axis since the grab, in pixels. */
  distance: number
  /** Where the finger alone would have put the front, in pixels. */
  finger: number
  follow: Follow
  /** Steps the interrupted transition still had to go, from the current item. */
  heading: number
  ignored: boolean
  /** Speed the interrupted transition had, in case it has to carry on. */
  momentum: number
  /** Where the front is, in pixels. */
  offset: number
  /** Finger travel over time, for reading flicks. */
  samples: Sample[]
  /** Progress over time, for the speed of what is drawn. */
  shown: Sample[]
}

interface Override {
  direction: Direction
  index: number
}

const LANDED = { progress: 0.002, velocity: 0.02 }
const SAMPLE_LIMIT = 30
/** Progress stops just short of a whole step, which only a landing crosses. */
const PROGRESS_LIMIT = 0.999
const SMOOTH_REST = 1e-3

/**
 * The swipe itself: which item is shown, how far a step toward a neighbour has
 * come and where it is heading. Progress is signed, positive toward the next
 * item. A target counts steps from the current item, so a swipe or key during
 * a transition sends it one item further and the settle lands each item it
 * passes. Input on another axis during a transition is ignored. Input arrives
 * in pixels along the swipe axis; a step spans the screen.
 */
export class PagerModel {
  axes: Axis[]
  axis: Axis
  config: PagerConfig
  index = -1
  /** Signed progress toward a neighbour, in steps. */
  progress = 0
  /** Progress speed, smoothed for what is drawn, in steps per second. */
  smoothVelocity = 0
  /** Steps a released swipe settles through; 0 returns to the current item. */
  target = 0
  touch: null | Point = null
  /** Progress speed in steps per second. */
  velocity = 0
  /** Whether frames are needed: a finger is down or something moves. */
  get active(): boolean {
    return (
      this.drag !== null || this.transitioning || this.velocity !== 0 || this.smoothVelocity !== 0
    )
  }
  get direction(): Direction {
    return (Math.sign(this.progress) || Math.sign(this.target) || 1) as Direction
  }

  get dragging(): boolean {
    return !!this.drag?.axis && !this.drag.ignored
  }

  get phase(): Phase {
    return this.dragging ? "dragging" : this.transitioning ? "settling" : "idle"
  }

  get to(): null | number {
    return this.transitioning ? this.destination(this.direction) : null
  }

  get transitioning(): boolean {
    return this.progress !== 0 || this.target !== 0
  }

  private drag: Drag | null = null

  private override: null | Override = null

  constructor(private options: ModelOptions) {
    this.axes = options.axes
    this.config = options.config
    this.axis = options.axes[0] ?? "y"
  }

  destination(direction: Direction): null | number {
    if (this.override?.direction === direction) return this.override.index
    if (this.index < 0) return null
    return this.options.neighbor(this.index, this.axis, direction)
  }

  frame(): Omit<PagerFrame, "flow" | "time"> {
    return {
      axis: this.axis,
      direction: this.direction,
      from: this.index,
      phase: this.phase,
      progress: Math.min(1, Math.abs(this.progress)),
      to: this.to,
      touch: this.touch,
      velocity: this.smoothVelocity
    }
  }

  /** Steps to any item as one transition, along `axis`. Refused while a step is under way. */
  goTo(index: number, axis = this.axis): boolean {
    if (!Number.isInteger(index) || index < 0) return false
    if (this.drag || this.transitioning || index === this.index || this.index < 0) return false
    this.touch = null
    this.axis = axis
    const direction = Math.sign(index - this.index) as Direction
    this.override = { direction, index }
    this.target = direction
    return true
  }

  /** A pointer went down. A step under way holds where it is and follows the finger from there. */
  grab(point: Point, time?: number): void {
    if (this.index < 0) return
    this.touch = point
    const held = this.transitioning
    const heading = this.target
    const momentum = this.velocity
    this.target = 0
    this.velocity = 0
    const offset = this.unshown(this.progress) * this.span()
    this.drag = {
      axis: held ? this.axis : null,
      distance: 0,
      finger: offset,
      // The front catches up to the finger only on a fresh swipe; a held step tracks it one to one.
      follow: held ? offsetFollow() : createFollow(this.config.follow),
      heading,
      ignored: false,
      momentum,
      offset,
      samples: time === undefined ? [] : [{ t: time, value: 0 }],
      shown: time === undefined ? [] : [{ t: time, value: this.progress }]
    }
  }

  /**
   * The drag committed to an axis. Returns the axis it tracks, or null to
   * ignore it. A gesture across a held step along another enabled axis is
   * ignored and the step carries on.
   */
  lock(axis: Axis): Axis | null {
    const drag = this.drag
    if (!drag) return null
    if (drag.axis) {
      if (axis === drag.axis || !this.axes.includes(axis)) return drag.axis
      drag.ignored = true
      this.target = drag.heading
      this.velocity = drag.momentum
      return null
    }
    if (!this.axes.includes(axis)) {
      drag.ignored = true
      return null
    }
    drag.axis = axis
    this.axis = axis
    return axis
  }

  /** The finger is `distance` pixels along the axis from the grab, positive toward the next item. */
  move(distance: number, point: Point, time: number): void {
    const drag = this.drag
    if (!drag?.axis || drag.ignored) return
    const delta = distance - drag.distance
    this.touch = point
    drag.distance = distance
    drag.samples.push({ t: time, value: distance })
    if (drag.samples.length > SAMPLE_LIMIT) drag.samples.shift()
    drag.finger += delta

    const span = this.span()
    drag.offset = drag.follow.advance(drag.offset, delta, {
      at: this.axis === "y" ? point.y : point.x,
      finger: drag.finger,
      hasNeighbor: (direction) => this.destination(direction) !== null,
      span
    })
    let progress = drag.offset / span
    // Whole steps land during the drag, so one long swipe can pass several items.
    while (Math.abs(progress) >= 1) {
      const direction = Math.sign(progress) as Direction
      if (!this.advance(direction)) break
      drag.follow.land()
      drag.offset -= direction * span
      drag.finger -= direction * span
      // A landing the way the held step was heading takes one step off it; any other ends it.
      drag.heading = Math.sign(drag.heading) === direction ? drag.heading - direction : 0
      for (const sample of drag.shown) sample.value -= direction
      progress = drag.offset / span
      this.options.onCommit?.()
    }
    const direction = Math.sign(progress) as 0 | Direction
    if (this.override && this.override.direction !== direction) this.override = null
    this.progress = clamp(this.shown(progress), -PROGRESS_LIMIT, PROGRESS_LIMIT)
    drag.shown.push({ t: time, value: this.progress })
    if (drag.shown.length > SAMPLE_LIMIT) drag.shown.shift()
  }

  /** Drops steps that no longer lead anywhere after the source or neighbours change. */
  reconcile(): void {
    this.target = this.reachable(this.target)
    if (this.drag) this.drag.heading = this.reachable(this.drag.heading)
  }

  /**
   * The pointer went up. Flicks read the finger's speed; otherwise the halfway
   * point decides. A flick during a held step goes one item past where the
   * step was heading, or one item back from it. The settle carries on at the
   * speed the content was moving, which differs from the finger's when the
   * front runs ahead or an edge holds it back.
   */
  release(time: number): void {
    const drag = this.drag
    this.drag = null
    // An ignored drag left the transition to carry on; a tap leaves it at rest.
    if (drag?.ignored) return
    if (!drag?.axis) {
      this.target = 0
      return
    }
    const finger = this.fingerVelocity(drag, time)
    this.velocity = this.shownVelocity(drag, time)
    const { flick } = this.config.swipe
    const sign = Math.sign(this.progress)
    const held = drag.heading !== 0 && (sign === 0 || sign === Math.sign(drag.heading))
    let target: number
    if (held && Math.abs(finger) > flick) {
      target = drag.heading + Math.sign(finger)
    } else {
      const progress = drag.follow.decide(this.progress, drag.finger / this.span())
      target = settleStep(progress, finger, {
        canNext: this.destination(1) !== null,
        canPrev: this.destination(-1) !== null,
        flick
      })
    }
    this.target = this.reachable(target)
    if (this.target !== 0) this.options.onCommit?.()
  }

  /** Maps an input axis to one the pager moves along, falling back to the first. */
  resolveAxis(axis: Axis): Axis {
    return this.axes.includes(axis) ? axis : (this.axes[0] ?? axis)
  }

  setAxes(axes: Axis[]): void {
    this.axes = axes
    if (!this.transitioning && !this.drag && !axes.includes(this.axis)) this.axis = axes[0] ?? "y"
  }

  setConfig(config: PagerConfig): void {
    this.config = config
  }

  /** Shows an item at once, without a transition. */
  setIndex(index: number): void {
    if (!Number.isInteger(index) || index < -1) return
    this.drag = null
    this.touch = null
    this.override = null
    this.progress = 0
    this.target = 0
    this.velocity = 0
    this.smoothVelocity = 0
    this.index = index
    this.options.onIndex?.(index)
  }

  /** One step more along `axis`; during a transition it adds to where that is heading. */
  step(axis: Axis, direction: Direction): boolean {
    if (this.drag || this.index < 0 || !this.axes.includes(axis)) return false
    if (this.transitioning && axis !== this.axis) return false
    this.axis = axis
    const target = this.reachable(this.target + direction)
    if (target === this.target) return false
    this.target = target
    this.options.onCommit?.()
    return true
  }

  /** Advances the released motion by `dt` seconds. Returns whether it still moves. */
  update(dt: number, now: number): boolean {
    // A finger holds the transition still until its drag is locked or ignored.
    if (this.drag && !this.drag.ignored) {
      this.velocity = this.dragging ? this.shownVelocity(this.drag, now) : 0
      this.smooth(dt)
      return true
    }
    if (!this.transitioning && this.velocity === 0) return this.smooth(dt)
    const { damping, omega } = this.config.motion
    const before = this.progress
    const next = springStep(this.progress, this.velocity, this.target, omega, dt, damping)
    this.progress = next.position
    this.velocity = next.velocity
    // Items on the way to a farther target land as they are passed.
    while (Math.abs(this.target) > 1 && Math.abs(this.progress) >= 1) {
      const direction = Math.sign(this.progress) as Direction
      if (!this.advance(direction)) break
      this.progress -= direction
      this.target -= direction
      this.options.onCommit?.()
    }
    this.smooth(dt)
    const landed =
      Math.abs(this.target - this.progress) < LANDED.progress &&
      Math.abs(this.velocity) < LANDED.velocity
    // A return to the current item stops there instead of swinging past it.
    const crossed = this.target === 0 && Math.sign(this.progress) === -Math.sign(before)
    if (!landed && !crossed) return true
    const step = this.target
    this.progress = 0
    this.target = 0
    this.velocity = 0
    if (step !== 0) this.advance(step as Direction)
    this.override = null
    return this.smoothVelocity !== 0
  }

  // Moves the index one step without animating; callers adjust progress.
  private advance(direction: Direction): boolean {
    const destination = this.destination(direction)
    this.override = null
    if (destination === null) return false
    this.index = destination
    this.options.onIndex?.(destination)
    return true
  }

  // Finger speed in steps per second. A finger resting on the screen sends no
  // moves, so a speed whose last sample is older than the window counts as zero.
  private fingerVelocity(drag: Drag, now: number): number {
    return this.recentVelocity(drag.samples, now) / this.span()
  }

  // Clips a target to the steps that lead somewhere.
  private reachable(target: number): number {
    const direction = Math.sign(target) as 0 | Direction
    if (!direction) return 0
    let index = this.index
    let steps = 0
    while (steps < Math.abs(target)) {
      const next =
        steps === 0
          ? this.destination(direction)
          : this.options.neighbor(index, this.axis, direction)
      if (next === null) break
      index = next
      steps++
    }
    return direction * steps
  }

  private recentVelocity(samples: Sample[], now: number): number {
    const { velocityWindow } = this.config.gesture
    const last = samples[samples.length - 1]
    if (!last || now - last.t > velocityWindow) return 0
    return trailingVelocity(samples, velocityWindow)
  }

  // Progress as shown: an edge gives only a share of the pull.
  private shown(progress: number): number {
    const direction = Math.sign(progress) as 0 | Direction
    const edge = direction !== 0 && this.destination(direction) === null
    return edge ? progress * this.config.swipe.rubber : progress
  }

  // Speed of the drawn progress in steps per second.
  private shownVelocity(drag: Drag, now: number): number {
    return this.recentVelocity(drag.shown, now)
  }

  // Eases the drawn speed toward the real one, which changes in steps with each pointer sample.
  private smooth(dt: number): boolean {
    const { smoothing } = this.config.motion
    const difference = this.velocity - this.smoothVelocity
    this.smoothVelocity += difference * (1 - Math.exp(-dt / smoothing))
    if (Math.abs(this.velocity - this.smoothVelocity) < SMOOTH_REST)
      this.smoothVelocity = this.velocity
    return this.smoothVelocity !== 0
  }

  private span(): number {
    return this.options.span(this.axis)
  }

  // The pull that shows as `progress`; the inverse of `shown`.
  private unshown(progress: number): number {
    const direction = Math.sign(progress) as 0 | Direction
    const edge = direction !== 0 && this.destination(direction) === null
    return edge ? progress / this.config.swipe.rubber : progress
  }
}
