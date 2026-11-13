import { describe, expect, it } from "vitest"

import type { Axis, DeepPartial, Point } from "./types"

import { mergeConfig, PAGER_DEFAULTS, type PagerConfig } from "./config"
import { PagerModel } from "./model"

const COUNT = 5
const SPAN = 800
const DT = 1 / 60

const setup = (config?: DeepPartial<PagerConfig>, index = 2, axes: Axis[] = ["y"]) => {
  const events = { commits: 0, indexes: [] as number[] }
  const model = new PagerModel({
    axes,
    config: mergeConfig(PAGER_DEFAULTS, { follow: { mode: "offset" }, ...config }),
    neighbor: (current, axis, direction) => {
      const next = current + direction * (axis === "x" ? 2 : 1)
      return next >= 0 && next < COUNT ? next : null
    },
    onCommit: () => events.commits++,
    onIndex: (value) => events.indexes.push(value),
    span: () => SPAN
  })
  model.setIndex(index)
  events.indexes.length = 0
  return { events, model }
}

const at = (y: number): Point => ({ x: 200, y })

/** Drags up by `pixels` over `steps` moves, `ms` apart. */
const swipe = (model: PagerModel, pixels: number, { ms = 16, steps = 10 } = {}) => {
  model.grab(at(600))
  expect(model.lock("y")).toBe("y")
  for (let i = 1; i <= steps; i++) {
    const distance = (pixels * i) / steps
    model.move(distance, at(600 - distance), i * ms)
  }
  return steps * ms
}

const settle = (model: PagerModel, now: number) => {
  for (let i = 0; i < 600; i++) if (!model.update(DT, now + i * DT * 1000)) return
  throw new Error("did not settle")
}

describe("dragging", () => {
  it("moves progress toward the next item", () => {
    const { model } = setup()
    swipe(model, 200)
    expect(model.progress).toBeCloseTo(0.25)
    const frame = model.frame()
    expect(frame).toMatchObject({ direction: 1, from: 2, phase: "dragging", to: 3 })
    expect(frame.touch).toEqual(at(400))
  })

  it("lands every item crossed by a single pointer sample", () => {
    const { events, model } = setup(undefined, 0)
    model.grab(at(600))
    model.lock("y")
    model.move(SPAN * 2 + 100, at(100), 16)
    expect(model.index).toBe(2)
    expect(model.progress).toBeCloseTo(100 / SPAN)
    expect(events.indexes).toEqual([1, 2])
  })

  it("rebases speed samples at a landing without reversing the drawn velocity", () => {
    const { model } = setup(undefined, 0)
    model.grab(at(600))
    model.lock("y")
    model.move(780, at(100), 0)
    model.move(790, at(90), 10)
    model.move(810, at(70), 30)
    model.release(30)
    expect(model.index).toBe(1)
    expect(model.velocity).toBeCloseTo(1.25)
    expect(model.target).toBe(1)
  })

  it("lands whole steps during a long drag", () => {
    const { events, model } = setup()
    swipe(model, SPAN + 200)
    expect(model.index).toBe(3)
    expect(model.progress).toBeCloseTo(0.25)
    expect(events).toEqual({ commits: 1, indexes: [3] })
  })

  it("rubber bands against an edge", () => {
    const { model } = setup(undefined, COUNT - 1)
    swipe(model, 400)
    expect(model.progress).toBeCloseTo(0.5 * PAGER_DEFAULTS.swipe.rubber)
    expect(model.frame().to).toBeNull()
  })

  it("ignores an axis it does not move along", () => {
    const { model } = setup()
    model.grab(at(600))
    expect(model.lock("x")).toBeNull()
    model.move(300, at(600), 16)
    expect(model.progress).toBe(0)
    model.release(32)
    expect(model.phase).toBe("idle")
  })

  it("runs the front ahead of the finger in catch mode", () => {
    const { model } = setup({ follow: { mode: "catch" } })
    swipe(model, 100, { steps: 20 })
    expect(model.progress * SPAN).toBeGreaterThan(100)
  })
})

describe("releasing", () => {
  it("measures both finger and drawn speed from the grab on a single-move flick", () => {
    const { model } = setup()
    model.grab(at(600), 0)
    model.lock("y")
    model.move(80, at(520), 20)
    model.release(25)
    expect(model.target).toBe(1)
    expect(model.velocity).toBeCloseTo(5)
  })

  it("settles to the next item past halfway", () => {
    const { events, model } = setup()
    const now = swipe(model, 500, { ms: 100 })
    model.release(now)
    expect(model.target).toBe(1)
    expect(model.phase).toBe("settling")
    settle(model, now)
    expect(model.index).toBe(3)
    expect(model.progress).toBe(0)
    expect(events).toEqual({ commits: 1, indexes: [3] })
  })

  it("springs back before halfway", () => {
    const { model } = setup()
    const now = swipe(model, 200, { ms: 100 })
    model.release(now)
    expect(model.target).toBe(0)
    settle(model, now)
    expect(model.index).toBe(2)
    expect(model.phase).toBe("idle")
  })

  it("flicks through on a fast short swipe", () => {
    const { model } = setup()
    const now = swipe(model, 100, { ms: 3 })
    model.release(now)
    expect(model.target).toBe(1)
  })

  it("springs back on a flick against the direction of travel", () => {
    const { model } = setup()
    const now = swipe(model, 300, { ms: 100 })
    model.move(250, at(350), now + 10)
    model.move(200, at(400), now + 20)
    model.release(now + 20)
    expect(model.target).toBe(0)
  })

  it("reads a resting finger as still", () => {
    const { model } = setup()
    const now = swipe(model, 100, { ms: 3 })
    model.release(now + 500)
    expect(model.target).toBe(0)
  })

  it("settles from an edge pull at the rubber band's own speed", () => {
    const { model } = setup(undefined, COUNT - 1)
    const now = swipe(model, 400, { ms: 4 })
    const finger = (400 - 40) / 0.036 / SPAN
    model.release(now)
    const pulled = Math.abs(model.progress)
    expect(model.velocity).toBeCloseTo(finger * PAGER_DEFAULTS.swipe.rubber, 1)
    for (let i = 0; i < 60; i++) {
      model.update(DT, now + i * 16)
      expect(Math.abs(model.progress)).toBeLessThan(pulled * 2)
    }
    expect(model.progress).toBe(0)
  })

  it("carries the front's own speed into the settle in catch mode", () => {
    const { model } = setup({ follow: { mode: "catch" } })
    const now = swipe(model, 200, { ms: 8, steps: 20 })
    const shown = model.progress
    model.release(now)
    expect(model.velocity).toBeGreaterThan(0)
    model.update(DT, now + 16)
    expect(model.progress).toBeGreaterThan(shown)
  })
})

describe("stepping", () => {
  it.each([NaN, Infinity, -Infinity, -1, 1.5])("refuses an invalid goTo index %s", (index) => {
    const { model } = setup()
    expect(model.goTo(index)).toBe(false)
    expect(model.active).toBe(false)
    expect(model.index).toBe(2)
  })

  it("ignores invalid immediate indices and clears all motion on a valid reset", () => {
    const { model } = setup()
    for (const index of [NaN, Infinity, -2, 1.5]) model.setIndex(index)
    expect(model.index).toBe(2)
    swipe(model, 300)
    model.setIndex(1)
    expect(model.frame()).toMatchObject({ from: 1, phase: "idle", progress: 0, touch: null })
    expect(model.active).toBe(false)
    model.setIndex(-1)
    model.grab(at(500), 0)
    expect(model.lock("y")).toBeNull()
    expect(model.active).toBe(false)
  })

  it("does not queue steps or goTo while dragging, or goTo while settling", () => {
    const { model } = setup()
    model.grab(at(600))
    expect(model.step("y", 1)).toBe(false)
    expect(model.goTo(0)).toBe(false)
    model.release(100)
    expect(model.step("y", 1)).toBe(true)
    expect(model.goTo(0)).toBe(false)
    settle(model, 100)
    expect(model.index).toBe(3)
  })

  it("lands every intermediate item even when one update crosses several steps", () => {
    const { events, model } = setup(undefined, 0)
    for (let i = 0; i < 4; i++) model.step("y", 1)
    model.update(0.2, 200)
    expect(events.indexes).toEqual([1, 2])
    expect(model.progress).toBeLessThan(1)
    settle(model, 200)
    expect(events.indexes).toEqual([1, 2, 3, 4])
  })

  it("steps and goes to any item", () => {
    const { events, model } = setup()
    expect(model.step("y", 1)).toBe(true)
    settle(model, 0)
    expect(model.index).toBe(3)
    expect(model.goTo(0)).toBe(true)
    expect(model.frame()).toMatchObject({ direction: -1, to: 0 })
    settle(model, 0)
    expect(model.index).toBe(0)
    expect(events.indexes).toEqual([3, 0])
  })

  it("refuses a step past an edge or along another axis", () => {
    const { model } = setup(undefined, COUNT - 1)
    expect(model.step("y", 1)).toBe(false)
    expect(model.step("x", -1)).toBe(false)
    expect(model.phase).toBe("idle")
  })

  it("chains steps asked for during a transition", () => {
    const { events, model } = setup()
    model.step("y", 1)
    for (let i = 0; i < 6; i++) model.update(DT, i * 16)
    expect(model.step("y", 1)).toBe(true)
    expect(model.target).toBe(2)
    settle(model, 100)
    expect(model.index).toBe(4)
    expect(events.indexes).toEqual([3, 4])
    expect(events.commits).toBe(3)
  })

  it("clips chained steps at an edge", () => {
    const { model } = setup(undefined, COUNT - 2)
    model.step("y", 1)
    expect(model.step("y", 1)).toBe(false)
    expect(model.target).toBe(1)
  })

  it("steps back during a transition return to the item it left", () => {
    const { model } = setup()
    model.step("y", 1)
    for (let i = 0; i < 6; i++) model.update(DT, i * 16)
    expect(model.step("y", -1)).toBe(true)
    settle(model, 100)
    expect(model.index).toBe(2)
  })
})

/** Starts a step and runs it for a few frames. */
const underway = (model: PagerModel, direction: -1 | 1 = 1) => {
  model.step("y", direction)
  for (let i = 0; i < 6; i++) model.update(DT, i * 16)
  return model.progress
}

describe("grabbing a step under way", () => {
  it("holds it where it is and follows the finger one to one", () => {
    const { model } = setup({ follow: { mode: "catch" } })
    const held = underway(model)
    expect(held).toBeGreaterThan(0.1)
    model.grab(at(600))
    expect(model.index).toBe(2)
    expect(model.progress).toBeCloseTo(held)
    expect(model.phase).toBe("dragging")
    expect(model.lock("x")).toBe("y")
    model.move(80, at(520), 16)
    expect(model.progress).toBeCloseTo(held + 80 / SPAN)
  })

  it("goes one item further on a forward flick", () => {
    const { events, model } = setup()
    underway(model)
    model.grab(at(600))
    model.lock("y")
    for (let i = 1; i <= 4; i++) model.move(i * 20, at(600 - i * 20), 100 + i * 4)
    model.release(116)
    expect(model.target).toBe(2)
    settle(model, 116)
    expect(model.index).toBe(4)
    expect(events.indexes).toEqual([3, 4])
  })

  it("returns to the item it left on a backward flick", () => {
    const { model } = setup()
    underway(model)
    model.grab(at(600))
    model.lock("y")
    for (let i = 1; i <= 4; i++) model.move(-i * 20, at(600 + i * 20), 100 + i * 4)
    model.release(116)
    expect(model.target).toBe(0)
    settle(model, 116)
    expect(model.index).toBe(2)
  })

  it("decides by the halfway point without a flick", () => {
    const { model } = setup()
    underway(model)
    model.grab(at(600))
    model.lock("y")
    model.move(300, at(300), 100)
    model.release(400)
    expect(model.target).toBe(1)
    settle(model, 400)
    expect(model.index).toBe(3)
  })

  it("keeps chaining once a step lands under the finger", () => {
    const { model } = setup(undefined, 1)
    underway(model)
    model.step("y", 1)
    expect(model.target).toBe(2)
    model.grab(at(700))
    model.lock("y")
    const needed = SPAN * (1 - model.progress) + 20
    model.move(needed, at(700 - needed), 100)
    expect(model.index).toBe(2)
    model.move(needed + 40, at(700 - needed - 40), 104)
    model.release(104)
    expect(model.target).toBe(2)
    settle(model, 104)
    expect(model.index).toBe(4)
  })
})

describe("mixed-input stress", () => {
  it.each(["catch", "offset"] as const)(
    "settles after rapid interleaved input in %s mode",
    (mode) => {
      const { model } = setup({ follow: { mode } }, 2, ["y", "x"])
      let seed = 42
      let now = 0
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 2 ** 32
      }
      for (let run = 0; run < 50; run++) {
        let down = false
        let distance = 0
        for (let input = 0; input < 40; input++) {
          now += 8 + random() * 16
          const axis: Axis = random() < 0.5 ? "x" : "y"
          const direction = random() < 0.5 ? -1 : 1
          switch (Math.floor(random() * 5)) {
            case 0:
              model.step(axis, direction)
              break
            case 1:
              model.goTo(Math.floor(random() * COUNT))
              break
            case 2:
              if (!down) {
                model.grab(at(600), now)
                model.lock(axis)
                distance = 0
                down = true
              }
              break
            case 3:
              distance += direction * random() * 300
              model.move(distance, at(600 - distance), now)
              break
            case 4:
              if (down) model.release(now)
              down = false
              break
          }
          model.update(DT, now)
          expect([model.progress, model.target, model.velocity].every(Number.isFinite)).toBe(true)
          expect(model.index).toBeGreaterThanOrEqual(0)
          expect(model.index).toBeLessThan(COUNT)
        }
        if (down) model.release(now)
        settle(model, now)
        now += 10000
        expect(model.phase).toBe("idle")
        expect(model.progress).toBe(0)
        expect(model.target).toBe(0)
      }
    }
  )
})

describe("drawn speed", () => {
  it("eases toward the finger's speed instead of jumping", () => {
    const { model } = setup()
    model.grab(at(600))
    model.lock("y")
    model.move(10, at(590), 0)
    model.move(20, at(580), 16)
    model.update(DT, 16)
    const raw = model.velocity
    expect(raw).toBeGreaterThan(0.5)
    expect(model.frame().velocity).toBeLessThan(raw * 0.3)
    for (let i = 0; i < 30; i++) model.update(DT, 16)
    expect(model.frame().velocity).toBeCloseTo(raw, 2)
  })
})

describe("edge returns", () => {
  it("grabs the returning content where it is", () => {
    const { model } = setup(undefined, COUNT - 1)
    const now = swipe(model, 400, { ms: 4 })
    model.release(now)
    for (let i = 0; i < 6; i++) model.update(DT, now + i * 16)
    const held = model.progress
    expect(held).toBeGreaterThan(0.01)
    model.grab(at(500))
    expect(model.progress).toBe(held)
    model.lock("y")
    model.move(50, at(450), now + 200)
    expect(model.progress).toBeCloseTo(held + (50 / SPAN) * PAGER_DEFAULTS.swipe.rubber)
    model.move(-SPAN * (held / PAGER_DEFAULTS.swipe.rubber) - 80, at(800), now + 300)
    expect(model.progress).toBeCloseTo(-80 / SPAN)
  })

  it("never swings past the current item on the way back", () => {
    const { model } = setup()
    const now = swipe(model, 300, { ms: 100 })
    model.move(250, at(350), now + 10)
    model.move(200, at(400), now + 20)
    model.release(now + 20)
    expect(model.target).toBe(0)
    for (let i = 0; i < 120; i++) {
      model.update(DT, now + 20 + i * 16)
      expect(model.progress).toBeGreaterThanOrEqual(0)
    }
    expect(model.phase).toBe("idle")
  })
})

describe("other axes during a transition", () => {
  it("preserves momentum and the target when an ignored drag ends before landing", () => {
    const { model } = setup(undefined, 1, ["y", "x"])
    underway(model)
    const velocity = model.velocity
    const progress = model.progress
    model.grab(at(500))
    expect(model.lock("x")).toBeNull()
    expect(model.velocity).toBe(velocity)
    model.release(120)
    expect(model.velocity).toBe(velocity)
    expect(model.progress).toBe(progress)
    expect(model.target).toBe(1)
    settle(model, 120)
    expect(model.index).toBe(2)
  })

  it("ignores a drag on another axis and lets the step carry on", () => {
    const { events, model } = setup(undefined, 2, ["y", "x"])
    underway(model)
    model.grab(at(500))
    expect(model.lock("x")).toBeNull()
    expect(model.phase).toBe("settling")
    model.move(200, { x: 300, y: 500 }, 100)
    expect(model.axis).toBe("y")
    for (let i = 0; i < 60; i++) model.update(DT, 100 + i * 16)
    expect(model.index).toBe(3)
    expect(model.phase).toBe("idle")
    model.release(1100)
    expect(model.phase).toBe("idle")
    expect(events.indexes).toEqual([3])
  })

  it("keeps a chained target when a drag on another axis is ignored", () => {
    const { model } = setup(undefined, 1, ["y", "x"])
    underway(model)
    model.step("y", 1)
    model.grab(at(500))
    model.lock("x")
    expect(model.target).toBe(2)
    settle(model, 100)
    expect(model.index).toBe(3)
  })

  it("refuses a key on another axis during a transition", () => {
    const { model } = setup(undefined, 1, ["y", "x"])
    underway(model)
    expect(model.step("x", 1)).toBe(false)
    settle(model, 100)
    expect(model.index).toBe(2)
    expect(model.axis).toBe("y")
    expect(model.step("x", 1)).toBe(true)
  })
})
