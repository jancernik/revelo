import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSSRApp, defineComponent } from "vue"
import { renderToString } from "vue/server-renderer"

import { useDevice } from "#src/composables/useDevice"

const hosts = new Set<{ unmount: () => void }>()
let media = Object.assign(new EventTarget(), { matches: false })
const host = () => {
  const wrapper = mount(defineComponent({ render: () => null, setup: useDevice }))
  hosts.add(wrapper)
  return wrapper
}

beforeEach(() => {
  vi.stubGlobal("innerHeight", 768)
  vi.stubGlobal("innerWidth", 650)
  media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media)
  )
})

afterEach(() => {
  for (const wrapper of hosts) wrapper.unmount()
  hosts.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("useDevice", () => {
  it("uses a strict 650px mobile threshold and follows resize", () => {
    const wrapper = host()
    expect(wrapper.vm.isMobile).toBe(false)
    expect(wrapper.vm.isTouchPrimary).toBe(false)
    window.innerWidth = 649
    window.dispatchEvent(new Event("resize"))
    expect(wrapper.vm.isMobile).toBe(true)
    window.innerWidth = 651
    window.dispatchEvent(new Event("resize"))
    expect(wrapper.vm.isMobile).toBe(false)
  })

  it("reads the initial coarse-pointer preference", () => {
    media.matches = true
    const match = vi.mocked(window.matchMedia)
    const wrapper = host()
    expect(wrapper.vm.isTouchPrimary).toBe(true)
    expect(match).toHaveBeenCalledWith("(pointer: coarse)")
  })

  it("follows coarse-pointer changes independently of window width", () => {
    const wrapper = host()
    media.matches = true
    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }))
    expect(wrapper.vm.isTouchPrimary).toBe(true)
    expect(wrapper.vm.isMobile).toBe(false)
    media.matches = false
    media.dispatchEvent(Object.assign(new Event("change"), { matches: false }))
    expect(wrapper.vm.isTouchPrimary).toBe(false)
  })

  it("unsubscribes from pointer and resize changes on unmount", () => {
    const remove = vi.spyOn(media, "removeEventListener")
    const wrapper = host()
    const state = wrapper.vm
    wrapper.unmount()
    hosts.delete(wrapper)
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function))
    media.matches = true
    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }))
    window.innerWidth = 300
    window.dispatchEvent(new Event("resize"))
    expect(state.isTouchPrimary).toBe(false)
    expect(state.isMobile).toBe(false)
  })

  it("falls back to mobile without touch during server rendering", async () => {
    vi.stubGlobal("window", undefined)
    const values: { isMobile: boolean; isTouchPrimary: boolean }[] = []
    await renderToString(
      createSSRApp(
        defineComponent({
          setup() {
            const { isMobile, isTouchPrimary } = useDevice()
            values.push({ isMobile: isMobile.value, isTouchPrimary: isTouchPrimary.value })
            return () => null
          }
        })
      )
    )
    expect(values).toEqual([{ isMobile: true, isTouchPrimary: false }])
  })
})
