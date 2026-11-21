import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSortableGrid } from "#src/composables/useSortableGrid"
import { gridImage } from "#src/test/gridFixtures"

type DragContext = { deltaX: number; hitTest: (target: Element, threshold: string) => boolean }
type DragOptions = {
  activeCursor: string
  cursor: string
  onDrag: (this: DragContext) => void
  onDragEnd: (this: DragContext) => void
  onDragStart: (this: DragContext) => void
  type: string
  zIndexBoost: boolean
}
type Tween = {
  duration?: number
  ease?: string
  onComplete?: () => void
  scale?: number
  x?: number
  y?: number
  zIndex?: number
}
const controls = vi.hoisted(() => {
  const configs: { el: Element; kill: ReturnType<typeof vi.fn>; options: DragOptions }[] = []
  return {
    configs,
    registerPlugin: vi.fn(),
    set: vi.fn<(target: unknown, vars: Record<string, unknown>) => void>(),
    timelineTo: vi.fn(),
    to: vi.fn<(target: unknown, vars: Tween) => void>()
  }
})
vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: controls.registerPlugin,
    set: controls.set,
    timeline: () => ({ to: controls.timelineTo }),
    to: controls.to
  }
}))
vi.mock("gsap/Draggable", () => ({
  Draggable: {
    create: (el: Element, options: DragOptions) => {
      const kill = vi.fn()
      controls.configs.push({ el, kill, options })
      return [{ kill }]
    }
  }
}))

const registrations = controls.registerPlugin.mock.calls.slice()
let resize = () => {}
const disconnect = vi.fn()
const observe = vi.fn()
let columns = "100px 100px"
let columnGap = "10px"
let rowGap = "20px"
const grids: ReturnType<typeof useSortableGrid>[] = []
const setup = (count = 4) => {
  const grid = useSortableGrid()
  grids.push(grid)
  const container = document.createElement("div")
  const elements = Array.from({ length: count }, () => {
    const el = document.createElement("div")
    el.className = "image-item"
    container.append(el)
    return el
  })
  const images = Array.from({ length: count }, (_, i) => gridImage(String(i)))
  const reorder = vi.fn()
  grid.init(container, images, reorder)
  return { container, elements, grid, images, reorder }
}
const config = (index: number) => {
  const captured = controls.configs[index]
  if (!captured) throw new Error(`Missing draggable ${index}`)
  return captured.options
}
const context = (target: Element | undefined, deltaX = 1): DragContext => ({
  deltaX,
  hitTest: vi.fn((el, threshold) => el === target && threshold === "50%")
})
const finish = (options: DragOptions, ctx: DragContext) => {
  options.onDragEnd.call(ctx)
  const tween = controls.to.mock.calls.at(-1)?.[1]
  tween?.onComplete?.()
}

beforeEach(() => {
  vi.clearAllMocks()
  controls.configs.length = 0
  columns = "100px 100px"
  columnGap = "10px"
  rowGap = "20px"
  vi.stubGlobal("getComputedStyle", () => ({ columnGap, gridTemplateColumns: columns, rowGap }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = disconnect
      observe = observe
      constructor(callback: () => void) {
        resize = callback
      }
    }
  )
})
afterEach(() => {
  grids.splice(0).forEach((grid) => grid.cleanup())
  vi.unstubAllGlobals()
})

describe("useSortableGrid", () => {
  it("registers the draggable plugin with GSAP", () => {
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.[0]).toEqual({ create: expect.any(Function) })
  })
  it("measures square cells and gaps, positions every item and observes the container", () => {
    const { container, elements } = setup()
    expect(controls.set).toHaveBeenCalledWith(container, { position: "relative" })
    expect(controls.set).toHaveBeenCalledWith(container, { height: 220 })
    elements.forEach((el, i) => {
      expect(controls.set).toHaveBeenCalledWith(el, { left: 0, position: "absolute", top: 0 })
      expect(controls.set).toHaveBeenCalledWith(el, {
        height: 100,
        width: 100,
        x: (i % 2) * 110,
        y: Math.floor(i / 2) * 120
      })
    })
    expect(controls.configs).toHaveLength(4)
    expect(config(0)).toMatchObject({
      activeCursor: "grabbing",
      cursor: "grab",
      type: "x,y",
      zIndexBoost: false
    })
    expect(observe).toHaveBeenCalledWith(container)
    columns = "60px 60px 60px"
    columnGap = "5px"
    rowGap = "7px"
    resize()
    expect(controls.set).toHaveBeenCalledWith(container, { height: 127 })
    expect(controls.set).toHaveBeenCalledWith(elements[2], { height: 60, width: 60, x: 130, y: 0 })
  })

  it("falls back to zero gaps and width for unmeasurable styles and permits empty cleanup", () => {
    columns = "none"
    columnGap = "normal"
    rowGap = "normal"
    const { container, elements } = setup(1)
    expect(controls.set).toHaveBeenCalledWith(container, { height: 0 })
    expect(controls.set).toHaveBeenCalledWith(elements[0], { height: 0, width: 0, x: 0, y: 0 })
    const empty = useSortableGrid()
    empty.cleanup()
  })

  it("reorders a valid rightward same-row hit and emits original objects only after snap completion", () => {
    const { elements, images, reorder } = setup()
    const options = config(0)
    const ctx = context(elements[1])
    options.onDragStart.call(ctx)
    expect(controls.to).toHaveBeenLastCalledWith(elements[0], {
      duration: 0.2,
      ease: "power2.out",
      zIndex: 201
    })
    options.onDrag.call(ctx)
    expect(ctx.hitTest).toHaveBeenCalledWith(elements[1], "50%")
    expect(controls.timelineTo).toHaveBeenCalledTimes(1)
    expect(controls.timelineTo).toHaveBeenCalledWith(
      elements[1],
      { duration: 0.25, ease: "power2.out", x: 0, y: 0 },
      "swap"
    )
    options.onDragEnd.call(ctx)
    expect(reorder).not.toHaveBeenCalled()
    expect(controls.to).toHaveBeenLastCalledWith(
      elements[0],
      expect.objectContaining({ duration: 0.2, ease: "power2.out", scale: 1, x: 110, y: 0 })
    )
    controls.to.mock.calls.at(-1)?.[1].onComplete?.()
    const result = reorder.mock.calls[0]?.[0]
    expect(result).toEqual([images[1], images[0], images[2], images[3]])
    expect(result[0]).toBe(images[1])
    expect(result[1]).toBe(images[0])
    expect(images.map((image) => image.id)).toEqual(["0", "1", "2", "3"])
  })

  it.each([
    { delta: -1, from: 0, to: 1 },
    { delta: 1, from: 1, to: 0 }
  ])("rejects wrong-direction same-row moves: $from to $to", ({ delta, from, to }) => {
    const { elements, images, reorder } = setup()
    const options = config(from)
    const ctx = context(elements[to], delta)
    options.onDragStart.call(ctx)
    options.onDrag.call(ctx)
    expect(controls.timelineTo).not.toHaveBeenCalled()
    finish(options, ctx)
    expect(reorder).toHaveBeenCalledWith(images)
  })

  it.each([-1, 0])("allows a leftward or stationary drag to the left with delta %s", (delta) => {
    const { elements, images, reorder } = setup()
    const options = config(1)
    const ctx = context(elements[0], delta)
    options.onDragStart.call(ctx)
    options.onDrag.call(ctx)
    finish(options, ctx)
    expect(reorder).toHaveBeenCalledWith([images[1], images[0], images[2], images[3]])
  })

  it("allows cross-row moves regardless of horizontal direction and skips other dragging items", () => {
    const { elements, images, reorder } = setup()
    const options = config(0)
    const ctx = context(elements[2], -1)
    options.onDragStart.call(ctx)
    config(1).onDragStart.call(ctx)
    options.onDrag.call(ctx)
    expect(vi.mocked(ctx.hitTest).mock.calls.every(([el]) => el !== elements[1])).toBe(true)
    finish(options, ctx)
    expect(reorder).toHaveBeenCalledWith([images[1], images[2], images[0], images[3]])
    expect(controls.to.mock.calls[1]?.[1].zIndex).toBe(202)
  })

  it("ignores a valid hit on another dragging item and moves to the next valid target", () => {
    const { images, reorder } = setup()
    const options = config(0)
    const ctx: DragContext = { deltaX: 1, hitTest: vi.fn(() => true) }
    options.onDragStart.call(ctx)
    config(1).onDragStart.call(ctx)
    options.onDrag.call(ctx)
    finish(options, ctx)
    expect(reorder).toHaveBeenCalledWith([images[1], images[2], images[0], images[3]])
  })

  it("does not measure a grid without items", () => {
    const measure = vi.fn(() => ({ columnGap, gridTemplateColumns: columns, rowGap }))
    vi.stubGlobal("getComputedStyle", measure)
    setup(0)
    expect(measure).not.toHaveBeenCalled()
    expect(controls.configs).toHaveLength(0)
  })

  it("does not reorder without a hit and resize does not move the dragging item", () => {
    const { elements, images, reorder } = setup()
    const options = config(0)
    const ctx = context(undefined)
    options.onDragStart.call(ctx)
    options.onDrag.call(ctx)
    expect(controls.timelineTo).not.toHaveBeenCalled()
    controls.set.mockClear()
    resize()
    expect(controls.set.mock.calls.some(([el]) => el === elements[0])).toBe(false)
    finish(options, ctx)
    expect(reorder).toHaveBeenCalledWith(images)
  })

  it("ignores a snap completion that settles after cleanup or a later init", () => {
    const { container, elements, grid, images, reorder } = setup()
    const options = config(0)
    const ctx = context(elements[1])
    options.onDragStart.call(ctx)
    options.onDrag.call(ctx)
    options.onDragEnd.call(ctx)
    const complete = controls.to.mock.calls.at(-1)?.[1].onComplete
    grid.cleanup()
    complete?.()
    expect(reorder).not.toHaveBeenCalled()
    grid.init(container, images, reorder)
    complete?.()
    expect(reorder).not.toHaveBeenCalled()
  })

  it("kills all draggables, disconnects and clears exactly the layout styles, idempotently", () => {
    const { container, elements, grid } = setup()
    grid.cleanup()
    expect(disconnect).toHaveBeenCalledTimes(1)
    controls.configs.forEach(({ kill }) => expect(kill).toHaveBeenCalledTimes(1))
    expect(controls.set).toHaveBeenCalledWith(container, { clearProps: "height,position" })
    elements.forEach((el) =>
      expect(controls.set).toHaveBeenCalledWith(el, {
        clearProps: "position,left,top,width,height,x,y,transform,zIndex,scale"
      })
    )
    controls.set.mockClear()
    resize()
    grid.cleanup()
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(controls.set).not.toHaveBeenCalled()
  })
})
