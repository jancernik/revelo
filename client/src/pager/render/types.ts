import type { PagerFrame } from "../types"

export interface Renderer {
  dispose(): void
  render(frame: PagerFrame, slides: SlideSource): void
  resize(width: number, height: number, pixelRatio: number): void
}

export interface Slide {
  /** Width over height. */
  aspect: number
  /** Pixels to draw, or null for a placeholder. A new object signals new pixels. */
  image: null | TexImageSource
}

export interface SlideSource {
  /** Number of items, as a non-negative integer. */
  readonly count: number
  get(index: number): Slide | undefined
}
