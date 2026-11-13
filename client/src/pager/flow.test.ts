import { describe, expect, it } from "vitest"

import { PAGER_DEFAULTS } from "./config"
import { createFlow } from "./flow"

const DT = 1 / 120
const config = { ...PAGER_DEFAULTS.flow, stretch: 1 }

const run = (
  flow: ReturnType<typeof createFlow>,
  progress: (i: number) => number,
  frames: number,
  touch = 0.2
) => {
  let moving = false
  for (let i = 0; i < frames; i++) moving = flow.update(progress(i), 0, touch, DT)
  return moving
}

describe("front", () => {
  it("caps the trail during rapid movement", () => {
    const flow = createFlow(config)
    flow.update(0.4, 4, 0.2, DT)
    const maximum = Math.max(...flow.state.lag.map(Math.abs))
    expect(maximum).toBeGreaterThan(0)
    expect(maximum).toBeLessThanOrEqual(config.stretch * config.front.limit)
  })

  it("rebuilds the front and resets bulge when reconfigured", () => {
    const flow = createFlow(config)
    run(flow, () => 0.4, 60)
    flow.configure({ ...config, front: { ...config.front, points: 12 } })
    expect(flow.state.lag).toHaveLength(12)
    expect(Array.from(flow.state.lag)).toEqual(Array(12).fill(0))
    expect(flow.state.bulge).toBe(0)
  })

  it("trails the finger, most far from the touch point", () => {
    const flow = createFlow(config)
    run(flow, (i) => i * 0.004, 60)
    const { lag } = flow.state
    const near = lag[Math.round(0.2 * (lag.length - 1))]
    const far = lag[lag.length - 1]
    expect(far).toBeLessThan(0)
    expect(Math.abs(far)).toBeGreaterThan(Math.abs(near))
  })

  it("carries on for a moment when the finger reverses", () => {
    const flow = createFlow(config)
    run(flow, (i) => i * 0.004, 60)
    const before = flow.state.lag[flow.state.lag.length - 1]
    run(flow, (i) => 0.24 - i * 0.004, 2)
    const after = flow.state.lag[flow.state.lag.length - 1]
    expect(after).toBeLessThan(0)
    expect(Math.sign(after)).toBe(Math.sign(before))
  })

  it("settles flat once the finger rests", () => {
    const flow = createFlow(config)
    run(flow, (i) => i * 0.004, 60)
    const moving = run(flow, () => 0.24, 600)
    expect(moving).toBe(false)
    expect(Math.max(...flow.state.lag)).toBe(0)
  })

  it("keeps its shape across a landing", () => {
    const flow = createFlow(config)
    run(flow, (i) => 0.7 + i * 0.004, 60)
    const before = Array.from(flow.state.lag)
    flow.update(-0.06, 0, 0.2, DT)
    const after = Array.from(flow.state.lag)
    for (let i = 0; i < before.length; i++) expect(after[i]).toBeCloseTo(before[i], 2)
  })

  it("resets to the finger", () => {
    const flow = createFlow(config)
    run(flow, (i) => i * 0.004, 60)
    flow.reset(0.24)
    expect(Math.max(...flow.state.lag)).toBe(0)
    flow.update(0.24, 0, 0.2, DT)
    expect(Math.max(...flow.state.lag.map(Math.abs))).toBe(0)
  })
})

describe("bulge", () => {
  it("responds equally to speed in either direction", () => {
    const forward = createFlow(config)
    const backward = createFlow(config)
    for (let i = 0; i < 120; i++) {
      forward.update(0.3, 2, 0.5, DT)
      backward.update(-0.3, -2, 0.5, DT)
    }
    expect(backward.state.bulge).toBeCloseTo(forward.state.bulge)
    expect(backward.state.bulge).toBeGreaterThan(config.shape)
  })

  it("grows with speed and settles back to its resting size", () => {
    const flow = createFlow(config)
    for (let i = 0; i < 240; i++) flow.update(0.5, 2, 0.5, DT)
    expect(flow.state.bulge).toBeCloseTo(config.shape + config.surge, 2)
    for (let i = 0; i < 480; i++) flow.update(0.5, 0, 0.5, DT)
    expect(flow.state.bulge).toBeCloseTo(config.shape, 2)
  })
})
