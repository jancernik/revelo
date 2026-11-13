import { describe, expect, it } from "vitest"

import { clamp, smoothstep, springStep, trailingVelocity } from "./math"

describe("clamp and smoothstep", () => {
  it("bound their input", () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(smoothstep(0, 1, 0.5)).toBe(0.5)
    expect(smoothstep(0, 1, 2)).toBe(1)
  })
})

describe("springStep", () => {
  it("preserves motion across different frame rates", () => {
    const coarse = springStep(0, 2, 1, 11, 1 / 20)
    let fine = { position: 0, velocity: 2 }
    for (let i = 0; i < 12; i++) fine = springStep(fine.position, fine.velocity, 1, 11, 1 / 240)
    expect(coarse.position).toBeCloseTo(fine.position, 5)
    expect(coarse.velocity).toBeCloseTo(fine.velocity, 5)
  })

  it("settles on the target without overshooting", () => {
    let state = { position: 0, velocity: 0 }
    let peak = 0
    for (let i = 0; i < 240; i++) {
      state = springStep(state.position, state.velocity, 1, 11, 1 / 60)
      peak = Math.max(peak, state.position)
    }
    expect(state.position).toBeCloseTo(1, 3)
    expect(peak).toBeLessThanOrEqual(1.0001)
  })

  it("overshoots with less damping", () => {
    let state = { position: 0, velocity: 0 }
    let peak = 0
    for (let i = 0; i < 240; i++) {
      state = springStep(state.position, state.velocity, 1, 11, 1 / 60, 0.5)
      peak = Math.max(peak, state.position)
    }
    expect(peak).toBeGreaterThan(1.1)
    expect(state.position).toBeCloseTo(1, 2)
  })
})

describe("trailingVelocity", () => {
  it("reads the speed over the trailing window only", () => {
    const samples = [
      { t: 0, value: 0 },
      { t: 500, value: 1000 },
      { t: 550, value: 1010 },
      { t: 600, value: 1020 }
    ]
    expect(trailingVelocity(samples, 90)).toBeCloseTo(200)
  })

  it("is zero without two samples", () => {
    expect(trailingVelocity([{ t: 0, value: 3 }], 90)).toBe(0)
  })
})
