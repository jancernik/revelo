import { describe, expect, it } from "vitest"

import { lockAxis, pursue, settleStep } from "./motion"

describe("lockAxis", () => {
  it("waits for the slop radius", () => {
    expect(lockAxis(3, 4, 8)).toBeNull()
    expect(lockAxis(6, 6, 8)).toBe("y")
    expect(lockAxis(9, 2, 8)).toBe("x")
  })
})

describe("settleStep", () => {
  const bounds = { canNext: true, canPrev: true, flick: 0.35 }

  it("goes through on a flick in the direction of travel", () => {
    expect(settleStep(0.2, 1, bounds)).toBe(1)
    expect(settleStep(-0.1, -2, bounds)).toBe(-1)
  })

  it("springs back on a flick against the direction of travel", () => {
    expect(settleStep(0.6, -1, bounds)).toBe(0)
  })

  it("decides by the halfway point otherwise", () => {
    expect(settleStep(0.51, 0, bounds)).toBe(1)
    expect(settleStep(0.49, 0, bounds)).toBe(0)
    expect(settleStep(-0.7, 0.1, bounds)).toBe(-1)
  })

  it("returns at exactly halfway or exactly the flick threshold", () => {
    expect(settleStep(0.5, 0, bounds)).toBe(0)
    expect(settleStep(-0.5, 0, bounds)).toBe(0)
    expect(settleStep(0.1, bounds.flick, bounds)).toBe(0)
  })

  it("stays put at the previous edge for both slow pulls and flicks", () => {
    expect(settleStep(-0.9, -2, { ...bounds, canPrev: false })).toBe(0)
    expect(settleStep(-0.9, 0, { ...bounds, canPrev: false })).toBe(0)
  })

  it("stays put at an edge", () => {
    expect(settleStep(0.9, 2, { ...bounds, canNext: false })).toBe(0)
  })
})

describe("pursue", () => {
  it("closes the gap symmetrically in either direction", () => {
    const forward = pursue(20, 5, () => 100, 0.01)
    const backward = pursue(-20, -5, () => 100, 0.01)
    expect(backward).toBeCloseTo(-forward)
    expect(forward).toBeGreaterThan(25)
    expect(forward).toBeLessThan(100)
  })

  it("runs the front ahead of the finger and closes in on it", () => {
    const span = 800
    const distance = 160
    const ease = 40
    let at = 700
    let finger = 0
    let offset = 0
    let travel = 0
    const gaps: number[] = []
    for (let move = 0; move < 100; move++) {
      at -= 4
      finger += 4
      travel += 4
      const reach = (direction: number) => (direction > 0 ? span - at : at)
      offset = pursue(offset, 4, reach, Math.min(1, travel / ease) / distance)
      gaps.push(span - at - offset)
      expect(offset).toBeLessThanOrEqual(span - at)
    }
    expect(offset).toBeGreaterThan(finger)
    expect(gaps[99]).toBeLessThan(gaps[20])
  })

  it("moves one to one without a direction", () => {
    expect(pursue(0, 0, () => 100, 0.01)).toBe(0)
  })
})
