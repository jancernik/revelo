import type { CatchConfig, FollowConfig } from "./config"
import type { Direction } from "./types"

import { pursue } from "./motion"

/** How the front moves with the finger during a drag. */
export interface Follow {
  /** Front offset after the finger moved by `delta` pixels. */
  advance(offset: number, delta: number, context: FollowContext): number
  /** Progress the release reads, given where the front is and where the finger would have put it. */
  decide(visual: number, finger: number): number
  /** A step landed during the drag. */
  land(): void
}

export interface FollowContext {
  /** Finger position along the axis, in pixels from the pager's edge. */
  at: number
  /** Where the finger alone would have put the front, in pixels. */
  finger: number
  hasNeighbor: (direction: Direction) => boolean
  /** Screen length along the axis, in pixels. */
  span: number
}

export function createFollow(config: FollowConfig): Follow {
  return config.mode === "catch" ? catchFollow(config.catch) : offsetFollow()
}

/** The front sits where the finger puts it. */
export function offsetFollow(): Follow {
  return {
    advance: (offset, delta) => offset + delta,
    decide: (visual) => visual,
    land() {}
  }
}

/**
 * The front runs ahead of the finger, closing a share of the gap to it on
 * every move, and settles onto it once they meet. After a step lands under the
 * finger the rest of the drag tracks it one to one. The release weighs the
 * finger's travel as much as the front's position.
 */
function catchFollow({ distance, ease }: CatchConfig): Follow {
  let chasing = true
  let travel = 0
  return {
    advance(offset, delta, { at, finger, hasNeighbor, span }) {
      if (!chasing) return offset + delta
      travel += Math.abs(delta)
      const reach = (direction: Direction) => {
        if (!hasNeighbor(direction)) return direction * finger
        return direction > 0 ? span - at : at
      }
      const rate = Math.min(1, travel / ease) / distance
      return pursue(offset, delta, reach, rate)
    },
    decide: (visual, finger) => (chasing ? (visual + finger) / 2 : visual),
    land() {
      chasing = false
    }
  }
}
