import { afterEach, describe, expect, it, vi } from "vitest"

import { type EngineOptions, PagerEngine } from "./engine"
import { browser, renderer, source } from "./test/helpers"

const engines: PagerEngine[] = []
const setup = (options: Partial<EngineOptions> = {}) => {
  const canvas = document.createElement("canvas")
  const keys = document.createElement("div")
  const drawing = renderer()
  const engine = new PagerEngine(canvas, {
    config: { follow: { mode: "offset" }, haptics: false },
    keys,
    renderer: drawing,
    slides: source(),
    ...options
  })
  engines.push(engine)
  return { canvas, drawing, engine, keys }
}

const key = (element: HTMLElement, name = "ArrowDown") =>
  element.dispatchEvent(new KeyboardEvent("keydown", { cancelable: true, key: name }))

const pointer = (element: HTMLElement, type: string, y: number, time: number) => {
  const event = new PointerEvent(type, {
    clientX: 200,
    clientY: y,
    pointerId: 1,
    pointerType: "touch"
  })
  Object.defineProperty(event, "timeStamp", { value: time })
  element.dispatchEvent(event)
}

afterEach(() => {
  for (const engine of engines.splice(0)) engine.dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("engine input and frames", () => {
  it("renders once per frame, reports landings and stops at rest", () => {
    const clock = browser()
    const onIndex = vi.fn()
    const onPhase = vi.fn()
    const { drawing, engine, keys } = setup({ onIndex, onPhase })
    expect(onIndex).toHaveBeenCalledWith(0)
    expect(drawing.resize).toHaveBeenCalledWith(600, 800, window.devicePixelRatio)
    clock.flush()
    drawing.render.mockClear()
    key(keys)
    engine.redraw()
    engine.redraw()
    expect(clock.frames.size).toBe(1)
    clock.frame()
    expect(drawing.render).toHaveBeenCalledTimes(1)
    expect(onPhase).toHaveBeenLastCalledWith("settling")
    clock.flush()
    expect(engine.index).toBe(1)
    expect(onIndex.mock.calls).toEqual([[0], [1]])
    expect(onPhase.mock.calls).toEqual([["settling"], ["idle"]])
    expect(engine.frame).toMatchObject({ from: 1, phase: "idle", progress: 0, to: null })
  })

  it("maps keyboard and shift-wheel input to the enabled axis without queuing cross-axis input", () => {
    const clock = browser()
    const { canvas, engine, keys } = setup()
    clock.flush()
    key(keys, "ArrowRight")
    clock.flush()
    expect(engine.index).toBe(1)
    engine.setAxes(["y", "x"])
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, shiftKey: true }))
    clock.frame()
    key(keys, "ArrowDown")
    clock.flush()
    expect(engine.index).toBe(2)
    expect(engine.frame?.axis).toBe("x")
    clock.frame(1000)
    expect(engine.index).toBe(2)
  })

  it("recognizes a fast swipe with only one move sample", () => {
    const clock = browser()
    const { canvas, engine } = setup()
    clock.flush()
    pointer(canvas, "pointerdown", 600, 1000)
    pointer(canvas, "pointermove", 520, 1020)
    pointer(canvas, "pointerup", 520, 1025)
    clock.flush()
    expect(engine.index).toBe(1)
  })

  it("does not queue keys or wheel input while a pointer holds the pager", () => {
    const clock = browser()
    const { canvas, engine, keys } = setup()
    clock.flush()
    pointer(canvas, "pointerdown", 600, 1000)
    key(keys)
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }))
    pointer(canvas, "pointerup", 600, 1100)
    clock.flush()
    expect(engine.index).toBe(0)
    key(keys)
    clock.flush()
    expect(engine.index).toBe(1)
  })

  it("redraws the last frame within a resize, before the cleared canvas can paint", () => {
    const clock = browser()
    const { drawing, engine } = setup()
    clock.flush()
    const last = engine.frame
    drawing.render.mockClear()
    drawing.resize.mockClear()
    clock.resize()
    expect(drawing.resize).toHaveBeenCalledTimes(1)
    expect(drawing.render).toHaveBeenCalledTimes(1)
    expect(drawing.render).toHaveBeenCalledWith(last, expect.anything())
    expect(clock.frames.size).toBe(1)
  })

  it("caps elapsed time after a paused tab", () => {
    const clock = browser()
    const { engine } = setup()
    clock.flush()
    engine.step("y", 1)
    clock.frame()
    clock.frame(5000)
    expect(engine.index).toBe(0)
    expect(engine.frame?.progress).toBeLessThan(0.5)
    clock.flush()
    expect(engine.index).toBe(1)
  })

  it("applies live config and reduced-motion preferences", () => {
    const clock = browser()
    const normal = setup().engine
    const reduced = setup().engine
    normal.setConfig({ haptics: false, reducedMotion: false })
    reduced.setConfig({ flow: { front: { points: 12 } }, haptics: false })
    clock.media.matches = true
    clock.media.dispatchEvent(new Event("change"))
    clock.flush()
    normal.step("y", 1)
    reduced.step("y", 1)
    clock.frame()
    expect(reduced.frame?.flow.lag).toHaveLength(12)
    expect(reduced.frame!.progress).toBeGreaterThan(normal.frame!.progress)
    clock.flush()
    expect(reduced.index).toBe(1)
  })
})

describe("engine lifecycle", () => {
  it("unbinds input, resize and media listeners and cancels scheduled frames", () => {
    const clock = browser()
    const { canvas, drawing, engine, keys } = setup()
    const removeMedia = vi.spyOn(clock.media, "removeEventListener")
    engine.dispose()
    expect(clock.disconnect).toHaveBeenCalledTimes(1)
    expect(removeMedia).toHaveBeenCalledWith("change", expect.any(Function))
    expect(clock.frames.size).toBe(0)
    key(keys)
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }))
    pointer(canvas, "pointerdown", 600, 10)
    clock.frame()
    expect(drawing.render).not.toHaveBeenCalled()
    expect(drawing.dispose).not.toHaveBeenCalled()
  })

  it("does not restart after disposal or a queued resize callback", () => {
    const clock = browser()
    const { drawing, engine } = setup()
    clock.flush()
    drawing.render.mockClear()
    drawing.resize.mockClear()
    engine.dispose()
    engine.redraw()
    clock.resize()
    expect(clock.frames.size).toBe(0)
    clock.frame()
    expect(clock.frames.size).toBe(0)
    expect(drawing.render).not.toHaveBeenCalled()
    expect(drawing.resize).not.toHaveBeenCalled()
  })

  it("stops immediately when an index callback disposes the engine", () => {
    const clock = browser()
    const { drawing, engine } = setup({
      onIndex: (index) => {
        if (index === 1) {
          engine.dispose()
          drawing.render.mockClear()
        }
      }
    })
    clock.flush()
    engine.step("y", 1)
    clock.flush()
    expect(drawing.render).not.toHaveBeenCalled()
    expect(clock.frames.size).toBe(0)
  })
})

describe("dynamic sources and indices", () => {
  it.each([NaN, Infinity, -1, 1.5, 6])("treats invalid neighbour %s as an edge", (next) => {
    const clock = browser()
    const { engine } = setup({ neighbor: () => next })
    engine.step("y", 1)
    clock.flush()
    expect(engine.index).toBe(0)
    expect(engine.frame?.phase).toBe("idle")
  })

  it("clips pending steps when the source shrinks without animating past the new edge", () => {
    const clock = browser()
    const { drawing, engine } = setup()
    engine.step("y", 1)
    engine.step("y", 1)
    clock.frame()
    engine.setSlides(source(2))
    clock.flush()
    expect(engine.index).toBe(1)
    expect(
      drawing.render.mock.calls.some(([frame]) => frame.from === 1 && frame.progress > 0)
    ).toBe(false)
  })

  it("allows valid transitions to continue when slides are added", () => {
    const clock = browser()
    const { engine } = setup()
    engine.step("y", 1)
    clock.frame()
    const progress = engine.frame!.progress
    engine.setSlides(source(8))
    clock.frame()
    expect(engine.frame!.progress).toBeGreaterThan(progress)
    clock.flush()
    expect(engine.index).toBe(1)
  })

  it("bounds the initial index and an immediate index change", () => {
    const clock = browser()
    const { engine } = setup({ index: 100 })
    clock.flush()
    expect(engine.index).toBe(5)
    engine.setIndex(-4)
    clock.flush()
    expect(engine.index).toBe(0)
    engine.setIndex(NaN)
    engine.setIndex(0.5)
    clock.flush()
    expect(engine.index).toBe(0)
  })

  it("clamps the current index when content shrinks, empties or arrives", () => {
    const clock = browser()
    const { engine } = setup({ index: 4 })
    engine.setSlides(source(2))
    clock.flush()
    expect(engine.index).toBe(1)
    engine.setSlides(source(0))
    clock.flush()
    expect(engine.index).toBe(-1)
    engine.step("y", 1)
    engine.goTo(0)
    clock.flush()
    expect(engine.index).toBe(-1)
    engine.setSlides(source(3))
    clock.flush()
    expect(engine.index).toBe(0)
  })

  it("reconciles a mutable source on redraw", () => {
    const clock = browser()
    const slides = { count: 6, get: () => ({ aspect: 1, image: null }) }
    const { engine } = setup({ index: 5, slides })
    clock.flush()
    slides.count = 2
    engine.redraw()
    clock.flush()
    expect(engine.index).toBe(1)
  })

  it("drops a goTo destination removed during its transition", () => {
    const clock = browser()
    const { engine } = setup({ index: 1 })
    engine.goTo(5)
    clock.frame()
    engine.setSlides(source(3))
    clock.flush()
    expect(engine.index).toBe(1)
    expect(engine.frame?.to).toBeNull()
  })

  it.each([NaN, Infinity, -Infinity, -1, 1.5, 6])("ignores an invalid goTo index %s", (index) => {
    const clock = browser()
    const { engine } = setup()
    clock.flush()
    engine.goTo(index)
    clock.flush()
    expect(engine.index).toBe(0)
  })
})
