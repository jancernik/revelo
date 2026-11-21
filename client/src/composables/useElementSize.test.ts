import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, nextTick, shallowRef } from "vue"

import { useElementSize } from "#src/composables/useElementSize"
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

const resize = (element: HTMLElement, width: number, height: number) => {
  vi.spyOn(element, "offsetWidth", "get").mockReturnValue(width)
  vi.spyOn(element, "offsetHeight", "get").mockReturnValue(height)
  return element
}
const sized = (width: number, height: number) =>
  resize(document.createElement("div"), width, height)

type Size = ReturnType<typeof useElementSize>
const values = (size: Size) => ({ height: size.height.value, width: size.width.value })

const render = (target: Parameters<typeof useElementSize>[0]) => {
  let size: Size | undefined
  const wrapper = mount(
    composableProbe(
      () => useElementSize(target),
      (state) => (size = state)
    )
  )
  if (!size) throw new Error("The probe did not run")
  return { size, wrapper }
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

describe("useElementSize", () => {
  it("reads the layout size on mount and observes the element", () => {
    const element = sized(320, 180)
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ height: 999, width: 999 })
    )
    const { size } = render(shallowRef(element))
    expect(values(size)).toEqual({ height: 180, width: 320 })
    expect(observer().observe).toHaveBeenCalledWith(element)
  })

  it("rereads the size when the observer reports a resize", () => {
    const element = sized(100, 50)
    const { size } = render(shallowRef(element))
    resize(element, 140, 70)
    observer().callback()
    expect(values(size)).toEqual({ height: 70, width: 140 })
  })

  it("reports zeros without an element and observes nothing", () => {
    const { size } = render(shallowRef(undefined))
    expect(values(size)).toEqual({ height: 0, width: 0 })
    expect(observer().observe).not.toHaveBeenCalled()
  })

  it("moves the observation to a new element and resets for a removed one", async () => {
    const first = sized(10, 20)
    const second = sized(30, 40)
    const target = shallowRef<HTMLElement | null>(first)
    const { size } = render(target)

    target.value = second
    await nextTick()
    expect(observer().unobserve).toHaveBeenCalledWith(first)
    expect(observer().observe).toHaveBeenLastCalledWith(second)
    expect(values(size)).toEqual({ height: 40, width: 30 })

    target.value = null
    await nextTick()
    expect(observer().unobserve).toHaveBeenLastCalledWith(second)
    expect(observer().observe).toHaveBeenCalledTimes(2)
    expect(values(size)).toEqual({ height: 0, width: 0 })
  })

  it("accepts a getter target", async () => {
    const element = sized(50, 60)
    const source = shallowRef<HTMLElement | null>(null)
    const { size } = render(() => source.value)
    source.value = element
    await nextTick()
    expect(observer().observe).toHaveBeenCalledWith(element)
    expect(values(size)).toEqual({ height: 60, width: 50 })
  })

  it("observes the root element of a component instance", () => {
    const child = mount(defineComponent({ render: () => h("div") }))
    resize(child.element, 11, 12)
    const { size } = render(shallowRef(child.vm))
    expect(observer().observe).toHaveBeenCalledWith(child.element)
    expect(values(size)).toEqual({ height: 12, width: 11 })
  })

  it("disconnects the observer on unmount", () => {
    const { wrapper } = render(shallowRef(sized(1, 1)))
    wrapper.unmount()
    expect(observer().disconnect).toHaveBeenCalledOnce()
  })

  it("still measures where ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const target = shallowRef<HTMLElement | null>(sized(10, 10))
    const { size, wrapper } = render(target)
    expect(values(size)).toEqual({ height: 10, width: 10 })
    target.value = sized(20, 25)
    await nextTick()
    expect(values(size)).toEqual({ height: 25, width: 20 })
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
