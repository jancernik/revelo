import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useTapActivation } from "#src/composables/useTapActivation"

let now = 0
beforeEach(() => {
  now = 1000
  vi.spyOn(performance, "now").mockImplementation(() => now)
})
afterEach(() => {
  vi.restoreAllMocks()
})

const pointer = (
  type: "pointerdown" | "pointerup",
  { clientX = 100, clientY = 100, pointerId = 1, pointerType = "touch" } = {}
) => new PointerEvent(type, { clientX, clientY, pointerId, pointerType })

const tap = (
  activation: ReturnType<typeof useTapActivation>,
  activate: () => void,
  { delay = 50, end = {}, start = {} } = {}
) => {
  activation.noteTapStart(pointer("pointerdown", start))
  now += delay
  activation.activateOnTap(pointer("pointerup", end), activate)
}

describe("useTapActivation", () => {
  it("activates a touch tap on release and swallows the click that follows once", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    tap(activation, activate)
    expect(activate).toHaveBeenCalledOnce()
    expect(activation.shouldSkipClick()).toBe(true)
    expect(activation.shouldSkipClick()).toBe(false)
  })

  it("treats pen input like touch", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    tap(activation, activate, { end: { pointerType: "pen" }, start: { pointerType: "pen" } })
    expect(activate).toHaveBeenCalledOnce()
  })

  it("leaves mouse input to the click handler", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    tap(activation, activate, { end: { pointerType: "mouse" }, start: { pointerType: "mouse" } })
    expect(activate).not.toHaveBeenCalled()
    expect(activation.shouldSkipClick()).toBe(false)
  })

  it.each([
    ["at the 10px slop", { clientX: 106, clientY: 108 }, 1],
    ["beyond the 10px slop", { clientX: 107, clientY: 108 }, 0]
  ])("activates %s only when the pointer stays within it", (_, end, calls) => {
    const activation = useTapActivation()
    const activate = vi.fn()
    tap(activation, activate, { end })
    expect(activate).toHaveBeenCalledTimes(calls)
    expect(activation.shouldSkipClick()).toBe(calls === 1)
  })

  it.each([
    [500, 1],
    [501, 0]
  ])("activates after a %sms hold only within the 500ms limit", (delay, calls) => {
    const activation = useTapActivation()
    const activate = vi.fn()
    tap(activation, activate, { delay })
    expect(activate).toHaveBeenCalledTimes(calls)
  })

  it("ignores a release from another pointer and forgets the start", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    activation.noteTapStart(pointer("pointerdown", { pointerId: 1 }))
    activation.activateOnTap(pointer("pointerup", { pointerId: 2 }), activate)
    activation.activateOnTap(pointer("pointerup", { pointerId: 1 }), activate)
    expect(activate).not.toHaveBeenCalled()
  })

  it("needs a recorded start and activates once per start", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    activation.activateOnTap(pointer("pointerup"), activate)
    expect(activate).not.toHaveBeenCalled()
    tap(activation, activate)
    activation.activateOnTap(pointer("pointerup"), activate)
    expect(activate).toHaveBeenCalledOnce()
  })

  it("does not consume a touch start on a mouse release", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    activation.noteTapStart(pointer("pointerdown"))
    activation.activateOnTap(pointer("pointerup", { pointerType: "mouse" }), activate)
    activation.activateOnTap(pointer("pointerup"), activate)
    expect(activate).toHaveBeenCalledOnce()
  })

  it("clears a pending click suppression on the next press, including a mouse press", () => {
    const activation = useTapActivation()
    tap(activation, vi.fn())
    activation.noteTapStart(pointer("pointerdown", { pointerType: "mouse" }))
    expect(activation.shouldSkipClick()).toBe(false)
  })

  it("keeps a touch start when a mouse press follows it", () => {
    const activation = useTapActivation()
    const activate = vi.fn()
    activation.noteTapStart(pointer("pointerdown"))
    activation.noteTapStart(pointer("pointerdown", { pointerType: "mouse" }))
    activation.activateOnTap(pointer("pointerup"), activate)
    expect(activate).toHaveBeenCalledOnce()
  })

  it("suppresses the click before calling the activation", () => {
    const activation = useTapActivation()
    let skipped: boolean | undefined
    tap(activation, () => (skipped = activation.shouldSkipClick()))
    expect(skipped).toBe(true)
  })

  it("keeps separate state per caller", () => {
    const first = useTapActivation()
    const second = useTapActivation()
    const activate = vi.fn()
    first.noteTapStart(pointer("pointerdown"))
    second.activateOnTap(pointer("pointerup"), activate)
    expect(activate).not.toHaveBeenCalled()
    first.activateOnTap(pointer("pointerup"), activate)
    expect(activate).toHaveBeenCalledOnce()
    expect(second.shouldSkipClick()).toBe(false)
    expect(first.shouldSkipClick()).toBe(true)
  })
})
