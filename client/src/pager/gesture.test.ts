import { afterEach, describe, expect, it, vi } from "vitest"

import { bindKeyboard, bindPointer, bindWheel, type PointerHandlers } from "./gesture"

const pointer = (type: string, x: number, y: number, extra: PointerEventInit = {}) =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: "touch", ...extra })

const setup = (lock: PointerHandlers["onLock"] = (axis) => axis) => {
  const element = document.createElement("div")
  const handlers = {
    onDrag: vi.fn(),
    onGrab: vi.fn(),
    onLock: vi.fn(lock),
    onRelease: vi.fn()
  }
  const unbind = bindPointer(element, handlers, () => ({ slop: 8, velocityWindow: 90 }))
  return { element, handlers, unbind }
}

afterEach(() => vi.restoreAllMocks())

describe("bindPointer", () => {
  it("uses local coordinates and releases on cancellation or lost capture", () => {
    const { element, handlers } = setup()
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 600, 800))
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    expect(handlers.onGrab).toHaveBeenCalledWith({ x: 90, y: 280 }, expect.any(Number))
    element.dispatchEvent(pointer("pointermove", 100, 260))
    element.dispatchEvent(pointer("lostpointercapture", 100, 260, { pointerId: 2 }))
    expect(handlers.onRelease).not.toHaveBeenCalled()
    element.dispatchEvent(pointer("lostpointercapture", 100, 260))
    expect(handlers.onRelease).toHaveBeenCalledTimes(1)
    element.dispatchEvent(pointer("pointerup", 100, 260))
    expect(handlers.onRelease).toHaveBeenCalledTimes(1)
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    element.dispatchEvent(pointer("pointercancel", 100, 300))
    expect(handlers.onRelease).toHaveBeenCalledTimes(2)
    expect(handlers.onGrab).toHaveBeenCalledTimes(2)
  })

  it("locks an axis past the slop radius and reports travel along it", () => {
    const { element, handlers } = setup()
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    expect(handlers.onGrab).toHaveBeenCalledWith({ x: 100, y: 300 }, expect.any(Number))
    element.dispatchEvent(pointer("pointermove", 102, 295))
    expect(handlers.onLock).not.toHaveBeenCalled()
    element.dispatchEvent(pointer("pointermove", 103, 280))
    expect(handlers.onLock).toHaveBeenCalledWith("y")
    expect(handlers.onDrag).toHaveBeenLastCalledWith(20, { x: 103, y: 280 }, expect.any(Number))
    element.dispatchEvent(pointer("pointerup", 103, 250))
    expect(handlers.onRelease).toHaveBeenCalledWith({ x: 103, y: 250 }, expect.any(Number))
  })

  it("tracks the axis the handler chooses", () => {
    const { element, handlers } = setup(() => "x")
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    element.dispatchEvent(pointer("pointermove", 90, 250))
    expect(handlers.onDrag).toHaveBeenLastCalledWith(10, { x: 90, y: 250 }, expect.any(Number))
  })

  it("drops a drag the handler ignores", () => {
    const { element, handlers } = setup(() => null)
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    element.dispatchEvent(pointer("pointermove", 100, 250))
    element.dispatchEvent(pointer("pointermove", 100, 200))
    expect(handlers.onDrag).not.toHaveBeenCalled()
    element.dispatchEvent(pointer("pointerup", 100, 200))
    expect(handlers.onRelease).toHaveBeenCalledTimes(1)
  })

  it("ignores other pointers and buttons", () => {
    const { element, handlers } = setup()
    element.dispatchEvent(pointer("pointerdown", 0, 0, { button: 2, pointerType: "mouse" }))
    expect(handlers.onGrab).not.toHaveBeenCalled()
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    element.dispatchEvent(pointer("pointerdown", 50, 50, { pointerId: 2 }))
    element.dispatchEvent(pointer("pointermove", 50, 0, { pointerId: 2 }))
    expect(handlers.onGrab).toHaveBeenCalledTimes(1)
    expect(handlers.onDrag).not.toHaveBeenCalled()
  })

  it("releases an active pointer capture when unbound", () => {
    const { element, handlers, unbind } = setup()
    element.setPointerCapture = vi.fn()
    element.hasPointerCapture = vi.fn(() => true)
    element.releasePointerCapture = vi.fn()
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    expect(element.setPointerCapture).toHaveBeenCalledWith(1)
    unbind()
    expect(element.releasePointerCapture).toHaveBeenCalledWith(1)
    element.dispatchEvent(pointer("lostpointercapture", 100, 300))
    element.dispatchEvent(pointer("pointermove", 100, 200))
    expect(handlers.onRelease).not.toHaveBeenCalled()
    expect(handlers.onDrag).not.toHaveBeenCalled()
  })

  it("unbinds", () => {
    const { element, handlers, unbind } = setup()
    unbind()
    element.dispatchEvent(pointer("pointerdown", 100, 300))
    expect(handlers.onGrab).not.toHaveBeenCalled()
  })
})

describe("bindKeyboard", () => {
  it.each(["altKey", "ctrlKey", "metaKey", "isComposing"])(
    "leaves modified or composing keys alone: %s",
    (modifier) => {
      const element = document.createElement("div")
      const onStep = vi.fn()
      bindKeyboard(element, onStep)
      const event = new KeyboardEvent("keydown", {
        cancelable: true,
        key: "ArrowLeft",
        [modifier]: true
      })
      element.dispatchEvent(event)
      expect(onStep).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    }
  )

  it("respects keys consumed by a child and removes its listener", () => {
    const element = document.createElement("div")
    const child = document.createElement("button")
    element.append(child)
    child.addEventListener("keydown", (event) => event.preventDefault())
    const onStep = vi.fn()
    const unbind = bindKeyboard(element, onStep)
    child.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
    )
    expect(onStep).not.toHaveBeenCalled()
    unbind()
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown" }))
    expect(onStep).not.toHaveBeenCalled()
  })

  it.each([
    ["ArrowDown", "y", 1],
    ["ArrowUp", "y", -1],
    ["ArrowRight", "x", 1],
    ["ArrowLeft", "x", -1],
    ["PageDown", "y", 1],
    ["PageUp", "y", -1]
  ])("maps %s and prevents native scrolling", (key, axis, direction) => {
    const element = document.createElement("div")
    const onStep = vi.fn()
    bindKeyboard(element, onStep)
    const event = new KeyboardEvent("keydown", { cancelable: true, key: String(key) })
    element.dispatchEvent(event)
    expect(onStep).toHaveBeenCalledWith(axis, direction)
    expect(event.defaultPrevented).toBe(true)
  })

  it("steps on arrow keys from the bound element only", () => {
    const element = document.createElement("div")
    const onStep = vi.fn()
    const unbind = bindKeyboard(element, onStep)
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }))
    expect(onStep).toHaveBeenCalledWith("y", 1)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
    expect(onStep).toHaveBeenCalledTimes(1)
    unbind()
  })

  it.each(["input", "select", "textarea"])("leaves keys alone inside %s fields", (tag) => {
    const element = document.createElement("div")
    const input = document.createElement(tag)
    element.append(input)
    const onStep = vi.fn()
    bindKeyboard(element, onStep)
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }))
    expect(onStep).not.toHaveBeenCalled()
  })
})

describe("bindWheel", () => {
  const wheel = (element: HTMLElement, init: WheelEventInit) =>
    element.dispatchEvent(new WheelEvent("wheel", { cancelable: true, ...init }))

  const setupWheel = () => {
    const element = document.createElement("div")
    const onStep = vi.fn()
    let now = 0
    vi.spyOn(performance, "now").mockImplementation(() => now)
    vi.spyOn(Event.prototype, "timeStamp", "get").mockImplementation(() => now)
    const unbind = bindWheel(element, onStep)
    return { element, onStep, tick: (ms: number) => (now += ms), unbind }
  }

  it.each([
    { deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: 3 },
    { deltaMode: WheelEvent.DOM_DELTA_PAGE, deltaY: 1 }
  ])("normalizes non-pixel wheel input: $deltaMode", (init) => {
    const { element, onStep } = setupWheel()
    wheel(element, init)
    expect(onStep).toHaveBeenCalledWith("y", 1)
  })

  it("preserves browser zoom and consumed events, and unbinds", () => {
    const { element, onStep, unbind } = setupWheel()
    const zoom = new WheelEvent("wheel", { cancelable: true, ctrlKey: true, deltaY: 100 })
    element.dispatchEvent(zoom)
    expect(zoom.defaultPrevented).toBe(false)
    const consumed = new WheelEvent("wheel", { cancelable: true, deltaY: 100 })
    consumed.preventDefault()
    element.dispatchEvent(consumed)
    expect(onStep).not.toHaveBeenCalled()
    const ordinary = new WheelEvent("wheel", { cancelable: true, deltaY: 100 })
    element.dispatchEvent(ordinary)
    expect(ordinary.defaultPrevented).toBe(true)
    expect(onStep).toHaveBeenCalledTimes(1)
    unbind()
    const later = new WheelEvent("wheel", { cancelable: true, deltaY: 100 })
    element.dispatchEvent(later)
    expect(later.defaultPrevented).toBe(false)
    expect(onStep).toHaveBeenCalledTimes(1)
  })

  it("steps once per mouse notch", () => {
    const { element, onStep, tick } = setupWheel()
    wheel(element, { deltaY: 100 })
    tick(500)
    wheel(element, { deltaY: 100 })
    tick(500)
    wheel(element, { deltaY: -100 })
    expect(onStep.mock.calls).toEqual([
      ["y", 1],
      ["y", 1],
      ["y", -1]
    ])
  })

  it("keeps one physical wheel gesture together when event delivery is delayed", () => {
    const { element, onStep, tick } = setupWheel()
    wheel(element, { deltaY: 100 })
    const delayed = new WheelEvent("wheel", { deltaY: 100 })
    Object.defineProperty(delayed, "timeStamp", { value: 16 })
    tick(500)
    element.dispatchEvent(delayed)
    expect(onStep).toHaveBeenCalledTimes(1)
    wheel(element, { deltaY: 100 })
    expect(onStep).toHaveBeenCalledTimes(2)
  })

  it("steps once per trackpad flick", () => {
    const { element, onStep, tick } = setupWheel()
    for (const deltaY of [4, 12, 30, 40, 25, 10, 3, 1]) {
      wheel(element, { deltaY })
      tick(16)
    }
    expect(onStep).toHaveBeenCalledTimes(1)
    tick(400)
    wheel(element, { deltaX: 60 })
    expect(onStep).toHaveBeenLastCalledWith("x", 1)
  })

  it("turns a vertical wheel sideways with shift", () => {
    const { element, onStep } = setupWheel()
    wheel(element, { deltaY: -100, shiftKey: true })
    expect(onStep).toHaveBeenCalledWith("x", -1)
  })
})
