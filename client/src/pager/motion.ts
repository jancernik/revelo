import type { Axis, Direction } from "./types"

export interface SettleBounds {
  canNext: boolean
  canPrev: boolean
  /** Speed, in steps per second, that counts as a flick. */
  flick: number
}

/** Axis a drag commits to once it leaves the slop radius. */
export function lockAxis(dx: number, dy: number, slop: number): Axis | null {
  if (Math.hypot(dx, dy) < slop) return null
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y"
}

/**
 * Moves a transition front that chases the finger. `offset` is how far the
 * front has travelled, `delta` how far the finger just moved and `reach(d)`
 * the finger's distance from the edge the front of direction d enters from.
 * Every move, forward or back, closes a share of the gap between front and
 * finger, so the front runs ahead while far behind and settles onto the finger.
 */
export function pursue(
  offset: number,
  delta: number,
  reach: (direction: Direction) => number,
  rate: number
): number {
  const next = offset + delta
  const direction = (Math.sign(next) || Math.sign(delta)) as 0 | Direction
  if (!direction) return next
  const gap = reach(direction) - direction * next
  return next + direction * gap * (1 - Math.exp(-Math.abs(delta) * rate))
}

/**
 * Where a released drag settles, in steps. A flick in the direction of travel
 * always goes through; otherwise the halfway point decides, like native paging.
 */
export function settleStep(
  progress: number,
  velocity: number,
  { canNext, canPrev, flick }: SettleBounds
): -1 | 0 | 1 {
  const allowed = (step: number) => (step > 0 ? canNext : step < 0 ? canPrev : true)
  if (Math.abs(velocity) > flick) {
    const step = Math.sign(velocity) as Direction
    const sameWay = progress === 0 || Math.sign(progress) === step
    return sameWay && allowed(step) ? step : 0
  }
  const step = Math.abs(progress) > 0.5 ? (Math.sign(progress) as Direction) : 0
  return allowed(step) ? step : 0
}
