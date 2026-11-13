import { describe, expect, it } from "vitest"

import { PAGER_DEFAULTS } from "./config"
import { createFollow } from "./follow"

const context = (at: number, finger: number) => ({
  at,
  finger,
  hasNeighbor: () => true,
  span: 800
})

describe("offset follow", () => {
  it("moves the front with the finger and reads the visual progress", () => {
    const follow = createFollow({ ...PAGER_DEFAULTS.follow, mode: "offset" })
    expect(follow.advance(10, 5, context(500, 15))).toBe(15)
    expect(follow.decide(0.3, 0.6)).toBe(0.3)
  })
})

describe("catch follow", () => {
  it("starts close to one-to-one before pursuit eases in", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    const offset = follow.advance(0, 0.1, context(699.9, 0.1))
    expect(offset).toBeGreaterThan(0.1)
    expect(offset).toBeLessThan(0.11)
  })

  it("pursues the previous item's entering edge on a reverse swipe", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    let offset = 0
    for (let i = 1; i <= 20; i++) {
      const at = 100 + i * 5
      offset = follow.advance(offset, -5, context(at, -i * 5))
      expect(offset).toBeGreaterThanOrEqual(-at)
    }
    expect(offset).toBeLessThan(-100)
  })

  it("runs the front ahead of the finger", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    let at = 700
    let finger = 0
    let offset = 0
    for (let move = 0; move < 20; move++) {
      at -= 5
      finger += 5
      offset = follow.advance(offset, 5, context(at, finger))
    }
    expect(offset).toBeGreaterThan(finger)
    expect(offset).toBeLessThanOrEqual(800 - at)
  })

  it("tracks the finger one to one after a step lands", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    follow.land()
    expect(follow.advance(100, 7, context(300, 107))).toBe(107)
    expect(follow.decide(0.3, 0.6)).toBe(0.3)
  })

  it("weighs the finger's travel with the front's position on release", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    expect(follow.decide(0.6, 0.2)).toBeCloseTo(0.4)
  })

  it("tracks the finger at an edge", () => {
    const follow = createFollow(PAGER_DEFAULTS.follow)
    const edge = { at: 300, finger: 40, hasNeighbor: () => false, span: 800 }
    const offset = follow.advance(35, 5, edge)
    expect(offset).toBeGreaterThan(35)
    expect(offset).toBeLessThanOrEqual(40)
  })
})
