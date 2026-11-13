export type LayoutMode = "framed" | "morph"

export interface LayoutRects {
  from: { clip: Rect; image: Rect }
  to: { clip: Rect; image: Rect }
}

/** A rectangle in pixels from the top left. */
export type Rect = [x: number, y: number, width: number, height: number]

/** Smallest rect of the given aspect covering the area, grown around its centre by `grow`. */
export function coverRect(aspect: number, [x, y, w, h]: Rect, grow = 1): Rect {
  const width = Math.max(w * grow, h * grow * aspect)
  const height = width / aspect
  return [x + (w - width) / 2, y + (h - height) / 2, width, height]
}

/** Largest rect of the given aspect centred in the area. */
export function fitRect(aspect: number, [x, y, w, h]: Rect): Rect {
  const width = Math.min(w, h * aspect)
  const height = width / aspect
  return [x + (w - width) / 2, y + (h - height) / 2, width, height]
}

const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  a.map((value, i) => value + (b[i] - value) * t) as Rect

const aspectOf = (rect: Rect) => rect[2] / rect[3]

/**
 * Image and clip rects for the items on either side of a transition. Framed
 * shows each item whole in its own frame. Morph shares one window that
 * reshapes from one frame to the other, each item covering it and overfilling
 * it by `overfill` mid-way, so small nudges stay inside the item.
 */
export function layoutRects(
  mode: LayoutMode,
  from: Rect,
  to: Rect,
  { morph, overfill }: { morph: number; overfill: number }
): LayoutRects {
  const hasTo = to[2] > 0 && to[3] > 0
  if (mode === "morph" && hasTo) {
    const clip = lerpRect(from, to, morph)
    // Overfill fades out at both ends, so each item lands exactly on its frame.
    const grow = 1 + (overfill - 1) * Math.sin(Math.PI * morph)
    return {
      from: { clip, image: coverRect(aspectOf(from), clip, grow) },
      to: { clip, image: coverRect(aspectOf(to), clip, grow) }
    }
  }
  return { from: { clip: from, image: from }, to: { clip: to, image: to } }
}
