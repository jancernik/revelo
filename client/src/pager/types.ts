export type Axis = "x" | "y"
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}
export type Direction = -1 | 1

/** The elastic front, for renderers that draw one. */
export interface FlowState {
  /** Bulge size under the finger, in steps. */
  bulge: number
  /** How far the front trails the finger at evenly spaced points across the screen, in steps. */
  lag: Float32Array
}

/** Where a step from an item leads, or null when nothing lies that way. */
export type Neighbor = (index: number, axis: Axis, direction: Direction) => null | number

/** Everything a renderer needs to draw one frame. */
export interface PagerFrame {
  axis: Axis
  direction: Direction
  flow: FlowState
  from: number
  phase: Phase
  /** How far the step toward `to` has come, 0 to 1. */
  progress: number
  /** Seconds since the pager started. */
  time: number
  /** The item being stepped to, or null when idle or pulling against an edge. */
  to: null | number
  /** Last pointer position within the pager, retained through settling. */
  touch: null | Point
  /** Progress speed in steps per second, positive toward the next item. */
  velocity: number
}

export type Phase = "dragging" | "idle" | "settling"

export interface Point {
  x: number
  y: number
}

export interface Size {
  height: number
  width: number
}
