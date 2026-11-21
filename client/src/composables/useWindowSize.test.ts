import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSSRApp, defineComponent } from "vue"
import { renderToString } from "vue/server-renderer"

import { useWindowSize } from "#src/composables/useWindowSize"

const hosts = new Set<{ unmount: () => void }>()
const host = () => {
  const wrapper = mount(defineComponent({ render: () => null, setup: useWindowSize }))
  hosts.add(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.stubGlobal("innerHeight", 768)
  vi.stubGlobal("innerWidth", 1024)
})

afterEach(() => {
  for (const wrapper of hosts) wrapper.unmount()
  hosts.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("useWindowSize", () => {
  it("provides the initial window size and subscribes passively", () => {
    const add = vi.spyOn(window, "addEventListener")
    const wrapper = host()
    expect(wrapper.vm.width).toBe(1024)
    expect(wrapper.vm.height).toBe(768)
    expect(add).toHaveBeenCalledWith("resize", expect.any(Function), { passive: true })
  })

  it("updates width and height on resize", () => {
    const wrapper = host()
    window.innerWidth = 800
    window.innerHeight = 600
    window.dispatchEvent(new Event("resize"))
    expect(wrapper.vm.width).toBe(800)
    expect(wrapper.vm.height).toBe(600)
  })

  it("removes the resize listener and stops updates on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const wrapper = host()
    const state = wrapper.vm
    wrapper.unmount()
    hosts.delete(wrapper)
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function))
    window.innerWidth = 300
    window.innerHeight = 400
    window.dispatchEvent(new Event("resize"))
    expect(state.width).toBe(1024)
    expect(state.height).toBe(768)
  })

  it("provides zero dimensions without a window during server rendering", async () => {
    vi.stubGlobal("window", undefined)
    const values: { height: number; width: number }[] = []
    await renderToString(
      createSSRApp(
        defineComponent({
          setup() {
            const { height, width } = useWindowSize()
            values.push({ height: height.value, width: width.value })
            return () => null
          }
        })
      )
    )
    expect(values).toEqual([{ height: 0, width: 0 }])
  })
})
