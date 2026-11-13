import type { DeepPartial } from "./types"

export interface CatchConfig {
  /** Finger travel, in pixels, over which the gap to the finger shrinks by a factor of e. */
  distance: number
  /** Finger travel over which the pursuit eases in, so the first pixels move one to one. */
  ease: number
}

export interface FlowConfig {
  bulge: {
    omega: number
    /** Speed, in steps per second, at which the bulge reaches its full moving size. */
    speed: number
  }
  front: FrontConfig
  /** Bulge size while the finger rests. */
  shape: number
  /** Scales how far the front trails the finger. */
  stretch: number
  /** Extra bulge while the finger moves. */
  surge: number
  /** 0 settles without overshoot; 1 rings for a while. */
  wobble: number
}

export interface FollowConfig {
  catch: CatchConfig
  /** Catch runs the front ahead of the finger until they meet; offset moves it one to one. */
  mode: "catch" | "offset"
}

export interface FrontConfig {
  /** Pull toward the finger at the touch point. */
  grip: number
  /** Trail length cap, in steps. */
  limit: number
  points: number
  /** Pull toward the finger far from the touch point. */
  slack: number
  substeps: number
  /** How strongly neighbouring points pull on each other. */
  tension: number
  /** Width of the firm region around the touch point, as a share of the screen. */
  width: number
}

export interface GestureConfig {
  /** Pixels a pointer moves before a drag commits to an axis. */
  slop: number
  /** Milliseconds of samples the release speed reads. */
  velocityWindow: number
}

/** How a released or triggered step moves. The spring is the easing: there is no fixed duration. */
export interface MotionConfig {
  /** Damping ratio of the settle spring: 1 lands without overshoot, lower bounces, higher drags. */
  damping: number
  /** Stiffness of the settle spring; higher lands sooner. 11 lands in about half a second. */
  omega: number
  /** Seconds over which the speed driving the bend and bulge is smoothed. */
  smoothing: number
}

export interface PagerConfig {
  flow: FlowConfig
  follow: FollowConfig
  gesture: GestureConfig
  haptics: boolean
  motion: MotionConfig
  /** Applies `REDUCED_MOTION` when the system asks for less motion. */
  reducedMotion: boolean
  swipe: SwipeConfig
}

export interface SwipeConfig {
  /** Finger speed, in steps per second, that counts as a flick. */
  flick: number
  /** Share of the finger's travel shown when pulling against an edge. */
  rubber: number
}

export const PAGER_DEFAULTS: PagerConfig = {
  flow: {
    bulge: { omega: 7, speed: 1.2 },
    front: { grip: 40, limit: 0.18, points: 32, slack: 8, substeps: 4, tension: 500, width: 0.18 },
    shape: 0.05,
    stretch: 0.15,
    surge: 0.3,
    wobble: 0.3
  },
  follow: { catch: { distance: 160, ease: 40 }, mode: "catch" },
  gesture: { slop: 8, velocityWindow: 90 },
  haptics: true,
  motion: { damping: 1, omega: 11, smoothing: 0.08 },
  reducedMotion: true,
  swipe: { flick: 0.35, rubber: 0.2 }
}

/** No elastic trail or bulge, and quicker landings. */
export const REDUCED_MOTION: DeepPartial<PagerConfig> = {
  flow: { shape: 0, stretch: 0, surge: 0 },
  motion: { omega: 18, smoothing: 0.04 }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** A copy of `base` with the values in `patch` applied, nested objects merged. */
export function mergeConfig<T extends object>(base: T, patch?: DeepPartial<T>): T {
  if (!patch) return base
  const result = { ...base } as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const current = result[key]
    result[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeConfig(current, value) : value
  }
  return result as T
}
