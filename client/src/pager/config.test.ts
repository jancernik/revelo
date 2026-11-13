import { describe, expect, expectTypeOf, it } from "vitest"

import type { DeepPartial } from "./types"

import { mergeConfig, PAGER_DEFAULTS } from "./config"
import { GLASS_DEFAULTS, type GlassConfig } from "./render/glass/config"

describe("mergeConfig", () => {
  it("merges nested overrides without mutating defaults or discarding siblings", () => {
    const original = structuredClone(PAGER_DEFAULTS)
    const config = mergeConfig(PAGER_DEFAULTS, {
      flow: { front: { points: 12 } },
      haptics: false,
      motion: { omega: 18, smoothing: undefined }
    })
    expect(config.flow.front).toEqual({ ...original.flow.front, points: 12 })
    expect(config.motion).toEqual({ ...original.motion, omega: 18 })
    expect(config.haptics).toBe(false)
    expect(PAGER_DEFAULTS).toEqual(original)
  })

  it("replaces arrays and preserves explicit zero values", () => {
    expectTypeOf<DeepPartial<GlassConfig>["background"]>().toEqualTypeOf<
      [number, number, number] | undefined
    >()
    const config = mergeConfig(GLASS_DEFAULTS, { background: [0, 0, 0], bend: 0 })
    expect(config.background).toEqual([0, 0, 0])
    expect(config.bend).toBe(0)
    expect(GLASS_DEFAULTS.bend).not.toBe(0)
  })
})
