import { describe, expect, it } from "vitest"

import { coverRect, fitRect, layoutRects, type Rect } from "./layout"

const from: Rect = [0, 100, 400, 200]
const to: Rect = [100, 0, 200, 400]

describe("fitRect and coverRect", () => {
  it("fit and cover an area, centred", () => {
    expect(fitRect(2, [0, 0, 400, 400])).toEqual([0, 100, 400, 200])
    expect(coverRect(2, [0, 0, 400, 400])).toEqual([-200, 0, 800, 400])
    expect(coverRect(1, [0, 0, 100, 100], 1.5)).toEqual([-25, -25, 150, 150])
  })
})

describe("layoutRects", () => {
  it("frames each item in its own rect", () => {
    const rects = layoutRects("framed", from, to, { morph: 0.5, overfill: 1.05 })
    expect(rects.from).toEqual({ clip: from, image: from })
    expect(rects.to).toEqual({ clip: to, image: to })
  })

  it("morphs one window and overfills it mid-way", () => {
    const rects = layoutRects("morph", from, to, { morph: 0.5, overfill: 1.05 })
    expect(rects.from.clip).toEqual([50, 50, 300, 300])
    expect(rects.to.clip).toEqual(rects.from.clip)
    expect(rects.from.image).toEqual([-115, 42.5, 630, 315])
    expect(rects.to.image).toEqual([42.5, -115, 315, 630])
  })

  it("lands each item exactly on its frame at the ends", () => {
    const start = layoutRects("morph", from, to, { morph: 0, overfill: 1.05 })
    expect(start.from.image).toEqual(from)
    expect(start.to.image).toEqual([0, -200, 400, 800])
    const end = layoutRects("morph", from, to, { morph: 1, overfill: 1.05 })
    expect(end.to.image).toEqual(to)
    expect(end.from.image).toEqual([-200, 0, 800, 400])
  })

  it("falls back to frames without a destination", () => {
    const none: Rect = [200, 200, 0, 0]
    const rects = layoutRects("morph", from, none, { morph: 0.3, overfill: 1.05 })
    expect(rects.from.image).toEqual(from)
    expect(rects.to.image).toEqual(none)
  })
})
