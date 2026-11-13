import type { FlowConfig, FrontConfig } from "./config"
import type { FlowState } from "./types"

import { springStep } from "./math"

const REST = { position: 1e-4, velocity: 1e-3 }
const BULGE_REST = 1e-3

export interface Flow {
  /** Rebuilds the simulation for a new configuration. */
  configure(config: FlowConfig): void
  reset(progress: number): void
  readonly state: FlowState
  /**
   * Advances by `dt` seconds. `touch` is the finger's position across the
   * screen, 0 to 1. Returns whether anything still moves.
   */
  update(progress: number, velocity: number, touch: number, dt: number): boolean
}

interface Front {
  lag: Float32Array
  last: number
  position: Float32Array
  velocity: Float32Array
}

/**
 * The elastic front of a transition and the bulge under the finger. The front
 * trails the finger while it moves, carries on briefly when it reverses and
 * settles with a wobble when it stops. The bulge eases toward its resting size
 * plus a share of its moving size that grows with speed.
 */
export function createFlow(initial: FlowConfig): Flow {
  let config = initial
  let front = createFront(config.front.points)
  let bulge = { value: 0, velocity: 0 }

  return {
    configure(next) {
      config = next
      front = createFront(config.front.points)
      bulge = { value: 0, velocity: 0 }
    },
    reset(progress) {
      resetFront(front, progress)
    },
    get state() {
      return { bulge: bulge.value, lag: front.lag }
    },
    update(progress, velocity, touch, dt) {
      // Wobble 0 settles without overshoot; 1 rings for a while.
      const damping = 1 - 0.75 * config.wobble
      const moving = stepFront(front, progress, touch, dt, config.front, damping, config.stretch)

      const speed = Math.min(1, Math.abs(velocity) / config.bulge.speed)
      const target = config.shape + config.surge * speed
      const next = springStep(bulge.value, bulge.velocity, target, config.bulge.omega, dt)
      const settled =
        Math.abs(next.position - target) < BULGE_REST && Math.abs(next.velocity) < BULGE_REST
      bulge = settled
        ? { value: target, velocity: 0 }
        : { value: next.position, velocity: next.velocity }
      return moving || !settled
    }
  }
}

function createFront(count: number): Front {
  return {
    lag: new Float32Array(count),
    last: 0,
    position: new Float32Array(count),
    velocity: new Float32Array(count)
  }
}

function resetFront(front: Front, progress: number) {
  front.position.fill(progress)
  front.velocity.fill(0)
  front.lag.fill(0)
  front.last = progress
}

/**
 * Advances the front as a damped elastic string across the screen. Every point
 * is pulled toward the drag progress, firmly under the finger and loosely at
 * the sides, and neighbours pull on each other. The trail is capped and scaled
 * into `lag`. Returns whether the string still moves.
 */
function stepFront(
  front: Front,
  progress: number,
  touch: number,
  dt: number,
  { grip, limit, slack, substeps, tension, width }: FrontConfig,
  damping: number,
  scale: number
): boolean {
  const { lag, position, velocity } = front
  const count = position.length

  // A step landing moves progress by a whole item at once; the shape carries over.
  const jump = progress - front.last
  if (Math.abs(jump) > 0.5) for (let i = 0; i < count; i++) position[i] += jump
  front.last = progress

  const h = dt / substeps
  for (let sub = 0; sub < substeps; sub++) {
    for (let i = 0; i < count; i++) {
      const across = i / (count - 1)
      const omega = slack + (grip - slack) * Math.exp(-(((across - touch) / width) ** 2))
      const left = position[Math.max(0, i - 1)]
      const right = position[Math.min(count - 1, i + 1)]
      const pull = omega * omega * (progress - position[i])
      const neighbours = tension * (left + right - 2 * position[i])
      velocity[i] += (pull + neighbours - 2 * damping * omega * velocity[i]) * h
    }
    for (let i = 0; i < count; i++) position[i] += velocity[i] * h
  }

  let moving = false
  for (let i = 0; i < count; i++) {
    const offset = position[i] - progress
    lag[i] = scale * limit * Math.tanh(offset / limit)
    if (Math.abs(offset) > REST.position || Math.abs(velocity[i]) > REST.velocity) moving = true
  }
  if (!moving) resetFront(front, progress)
  return moving
}
