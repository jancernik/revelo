import { beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

import { useAdaptiveFrameRate } from "#src/composables/useAdaptiveFrameRate"

const environment = vi.hoisted(() => ({ fps: vi.fn<(fps: number) => void>() }))
const isTouchPrimary = ref(true)
const settings = ref<{ capFrameRate?: boolean }>({ capFrameRate: true })

vi.mock("gsap", () => ({ gsap: { ticker: { fps: environment.fps } } }))
vi.mock("#src/composables/useDevice", () => ({ useDevice: () => ({ isTouchPrimary }) }))
vi.mock("#src/composables/useSettings", () => ({ useSettings: () => ({ settings }) }))

const FRAME = 1000 / 75

beforeEach(() => {
  environment.fps.mockReset()
  isTouchPrimary.value = true
  settings.value = { capFrameRate: true }
})

describe("useAdaptiveFrameRate", () => {
  it("caps the GSAP ticker at 75 fps on touch devices with the setting on", () => {
    useAdaptiveFrameRate().init()
    expect(environment.fps).toHaveBeenCalledOnce()
    expect(environment.fps).toHaveBeenCalledWith(75)
  })

  it.each([
    ["the setting is off", false, true],
    ["the pointer is fine", true, false],
    ["the setting is missing", undefined, true]
  ])("leaves the ticker alone when %s", (_, capFrameRate, touch) => {
    settings.value = { capFrameRate }
    isTouchPrimary.value = touch
    const adapter = useAdaptiveFrameRate()
    adapter.init()
    expect(environment.fps).not.toHaveBeenCalled()
    expect(adapter.shouldSkipFrame(100)).toBe(false)
    expect(adapter.shouldSkipFrame(101)).toBe(false)
  })

  it("skips frames that arrive sooner than one 75 fps interval after the last kept one", () => {
    const adapter = useAdaptiveFrameRate()
    expect(adapter.shouldSkipFrame(1000)).toBe(false)
    expect(adapter.shouldSkipFrame(1001)).toBe(true)
    expect(adapter.shouldSkipFrame(1000 + FRAME - 0.01)).toBe(true)
    expect(adapter.shouldSkipFrame(1000 + FRAME)).toBe(false)
    expect(adapter.shouldSkipFrame(1000 + FRAME + 5)).toBe(true)
    expect(adapter.shouldSkipFrame(1000 + 2 * FRAME)).toBe(false)
  })

  it("does not record a frame at timestamp zero", () => {
    const adapter = useAdaptiveFrameRate()
    expect(adapter.shouldSkipFrame(0)).toBe(false)
    expect(adapter.shouldSkipFrame(1)).toBe(false)
    expect(adapter.shouldSkipFrame(2)).toBe(true)
  })

  it("keeps a separate frame clock per caller", () => {
    const first = useAdaptiveFrameRate()
    const second = useAdaptiveFrameRate()
    expect(first.shouldSkipFrame(1000)).toBe(false)
    expect(second.shouldSkipFrame(1001)).toBe(false)
    expect(first.shouldSkipFrame(1002)).toBe(true)
  })

  it("reads the setting and pointer on every call", () => {
    const adapter = useAdaptiveFrameRate()
    expect(adapter.shouldSkipFrame(1000)).toBe(false)
    settings.value = { capFrameRate: false }
    expect(adapter.shouldSkipFrame(1001)).toBe(false)
    settings.value = { capFrameRate: true }
    expect(adapter.shouldSkipFrame(1002)).toBe(true)
    isTouchPrimary.value = false
    adapter.init()
    expect(adapter.shouldSkipFrame(1003)).toBe(false)
    expect(environment.fps).not.toHaveBeenCalled()
  })
})
