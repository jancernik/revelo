import type { LayoutMode } from "../layout"

export interface GlassConfig {
  /** Blur fills the screen around a frame with a dim copy of the image; black leaves it dark. */
  backdrop: "black" | "blur"
  background: [number, number, number]
  /** How much speed curves the images. */
  bend: number
  layout: LayoutConfig
  look: GlassLook
  maxPixelRatio: number
  /** Length of the front's trail, scaled by the look's bulge. */
  trail: number
}

export interface GlassLook {
  /** Bulge of the front under the thumb, scaled by the flow's bulge. */
  bulge: number
  /** How much more each colour channel bends than the last. */
  dispersion: number
  /** Blur behind the lip, 0 to 1. */
  frost: number
  /** Magnification around the thumb, 0 to 1. */
  lens: number
  /** How far the lip bends the incoming image, in pixels. */
  refraction: number
  /** Highlight along the front. */
  shine: number
  /** Width of the refracting lip, in pixels. */
  thickness: number
}

export interface Insets {
  bottom: number
  left: number
  right: number
  top: number
}

export interface LayoutConfig {
  /** Space around the frame area, for overlays. */
  insets: Insets
  mode: LayoutMode
  morph: {
    /** Share of each transition's own image motion kept inside the morph window. */
    drift: number
    /** How much larger than the window the images get mid-transition. */
    overfill: number
  }
  /** Corner radius of a frame, in pixels. */
  radius: number
}

export const GLASS_DEFAULTS: GlassConfig = {
  backdrop: "blur",
  background: [0.055, 0.055, 0.058],
  bend: 0.6,
  layout: {
    insets: { bottom: 16, left: 16, right: 16, top: 16 },
    mode: "framed",
    morph: { drift: 0.1, overfill: 1.05 },
    radius: 3
  },
  look: {
    bulge: 0.09,
    dispersion: 0.12,
    frost: 0,
    lens: 0,
    refraction: 46,
    shine: 0.07,
    thickness: 70
  },
  maxPixelRatio: 3,
  trail: 10
}
