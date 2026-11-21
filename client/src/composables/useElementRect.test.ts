import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, nextTick, shallowRef } from "vue"

import { useElementRect } from "#src/composables/useElementRect"
import { composableProbe } from "#src/test/composableProbe"

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
  constructor(readonly callback: () => void) {
    FakeResizeObserver.instances.push(this)
  }
}

const boxed = (x: number, y: number, width: number, height: number) => {
  const element = document.createElement("div")
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ height, width, x, y })
  )
  return element
}

type Rect = ReturnType<typeof useElementRect>
const values = (rect: Rect) => ({
  height: rect.height.value,
  width: rect.width.value,
  x: rect.x.value,
  y: rect.y.value
})

const render = (target: Parameters<typeof useElementRect>[0]) => {
  let rect: Rect | undefined
  const wrapper = mount(
    composableProbe(
      () => useElementRect(target),
      (state) => (rect = state)
    )
  )
  if (!rect) throw new Error("The probe did not run")
  return { rect, wrapper }
}

enableAutoUnmount(afterEach)
beforeEach(() => {
  FakeResizeObserver.instances = []
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const observer = () => {
  const [instance] = FakeResizeObserver.instances
  if (!instance) throw new Error("No ResizeObserver was created")
  return instance
}

describe("useElementRect", () => {
  it("measures the element on mount and observes it", () => {
    const element = boxed(10, 20, 300, 40)
    const { rect } = render(shallowRef(element))
    expect(values(rect)).toEqual({ height: 40, width: 300, x: 10, y: 20 })
    expect(FakeResizeObserver.instances).toHaveLength(1)
    expect(observer().observe).toHaveBeenCalledWith(element)
  })

  it("remeasures when the observer reports a resize", () => {
    const element = boxed(0, 0, 100, 50)
    const { rect } = render(shallowRef(element))
    vi.mocked(element.getBoundingClientRect).mockReturnValue(DOMRect.fromRect({ width: 120 }))
    observer().callback()
    expect(values(rect)).toEqual({ height: 0, width: 120, x: 0, y: 0 })
  })

  it("reports zeros without an element and observes nothing", () => {
    const { rect } = render(shallowRef(null))
    expect(values(rect)).toEqual({ height: 0, width: 0, x: 0, y: 0 })
    expect(observer().observe).not.toHaveBeenCalled()
  })

  it("moves the observation to a new element and resets for a removed one", async () => {
    const first = boxed(1, 2, 3, 4)
    const second = boxed(5, 6, 7, 8)
    const target = shallowRef<HTMLElement | null>(first)
    const { rect } = render(target)

    target.value = second
    await nextTick()
    expect(observer().unobserve).toHaveBeenCalledWith(first)
    expect(observer().observe).toHaveBeenLastCalledWith(second)
    expect(values(rect)).toEqual({ height: 8, width: 7, x: 5, y: 6 })

    target.value = null
    await nextTick()
    expect(observer().unobserve).toHaveBeenLastCalledWith(second)
    expect(observer().observe).toHaveBeenCalledTimes(2)
    expect(values(rect)).toEqual({ height: 0, width: 0, x: 0, y: 0 })
  })

  it("accepts a getter target", async () => {
    const element = boxed(0, 0, 50, 60)
    const source = shallowRef<HTMLElement | null>(null)
    const { rect } = render(() => source.value)
    expect(values(rect)).toEqual({ height: 0, width: 0, x: 0, y: 0 })
    source.value = element
    await nextTick()
    expect(observer().observe).toHaveBeenCalledWith(element)
    expect(values(rect)).toEqual({ height: 60, width: 50, x: 0, y: 0 })
  })

  it("observes the root element of a component instance", () => {
    const child = mount(defineComponent({ render: () => h("span") }))
    vi.spyOn(child.element, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ height: 5, width: 6, x: 7, y: 8 })
    )
    const { rect } = render(shallowRef(child.vm))
    expect(observer().observe).toHaveBeenCalledWith(child.element)
    expect(values(rect)).toEqual({ height: 5, width: 6, x: 7, y: 8 })
  })

  it("disconnects the observer on unmount", () => {
    const { wrapper } = render(shallowRef(boxed(0, 0, 1, 1)))
    wrapper.unmount()
    expect(observer().disconnect).toHaveBeenCalledOnce()
  })

  it("still measures where ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const target = shallowRef<HTMLElement | null>(boxed(1, 1, 10, 10))
    const { rect, wrapper } = render(target)
    expect(values(rect)).toEqual({ height: 10, width: 10, x: 1, y: 1 })
    target.value = boxed(2, 2, 20, 20)
    await nextTick()
    expect(values(rect)).toEqual({ height: 20, width: 20, x: 2, y: 2 })
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
