import { afterEach, describe, expect, it, vi } from "vitest"

import { PagerEngine } from "./engine"
import { createHaptics } from "./haptics"
import { browser, renderer, source } from "./test/helpers"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("haptics", () => {
  it("uses vibration when available without adding DOM", () => {
    const vibrate = vi.fn()
    vi.stubGlobal("navigator", { vibrate })
    createHaptics().tick()
    expect(vibrate).toHaveBeenCalledWith(8)
    expect(document.body.children).toHaveLength(0)
  })

  it("reuses and removes the fallback switch", () => {
    vi.stubGlobal("navigator", {})
    const haptics = createHaptics()
    haptics.tick()
    haptics.tick()
    expect(document.querySelectorAll("input[switch]")).toHaveLength(1)
    expect(haptics.dispose).toBeTypeOf("function")
    haptics.dispose?.()
    expect(document.querySelectorAll("input[switch]")).toHaveLength(0)
  })

  it("does not recreate a fallback switch after disposal during a chained landing", () => {
    const clock = browser()
    vi.stubGlobal("navigator", {})
    const engine = new PagerEngine(document.createElement("canvas"), {
      onIndex: (index) => {
        if (index === 1) engine.dispose()
      },
      renderer: renderer(),
      slides: source()
    })
    engine.step("y", 1)
    engine.step("y", 1)
    clock.flush()
    expect(document.querySelectorAll("input[switch]")).toHaveLength(0)
  })

  it("leaves caller-owned haptics alive on config changes and disposal", () => {
    const clock = browser()
    const haptics = { dispose: vi.fn(), tick: vi.fn() }
    const engine = new PagerEngine(document.createElement("canvas"), {
      haptics,
      renderer: renderer(),
      slides: source()
    })
    engine.setConfig({ haptics: false })
    engine.step("y", 1)
    clock.flush()
    engine.dispose()
    expect(haptics.tick).toHaveBeenCalled()
    expect(haptics.dispose).not.toHaveBeenCalled()
  })

  it("releases owned haptics on config changes and unmount", () => {
    const clock = browser()
    vi.stubGlobal("navigator", {})
    const engine = new PagerEngine(document.createElement("canvas"), {
      renderer: renderer(),
      slides: source()
    })
    engine.step("y", 1)
    clock.flush()
    expect(document.querySelectorAll("input[switch]")).toHaveLength(1)
    engine.setConfig({ haptics: false })
    expect(document.querySelectorAll("input[switch]")).toHaveLength(0)
    engine.setConfig({ haptics: true })
    engine.step("y", 1)
    clock.flush()
    engine.dispose()
    expect(document.querySelectorAll("input[switch]")).toHaveLength(0)
  })
})
