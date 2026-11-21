import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Scrollable from "#src/components/common/Scrollable.vue"

const scroll = vi.hoisted(() => ({
  create: vi.fn(),
  getAll: vi.fn(),
  kill: vi.fn(),
  registerPlugin: vi.fn(),
  scrollTo: vi.fn(),
  triggerKill: vi.fn()
}))
vi.mock("gsap", () => ({ gsap: { registerPlugin: scroll.registerPlugin } }))
vi.mock("gsap/ScrollSmoother", () => ({ ScrollSmoother: { create: scroll.create } }))
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { getAll: scroll.getAll } }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  scroll.create.mockReturnValue({ kill: scroll.kill, scrollTo: scroll.scrollTo })
  scroll.getAll.mockReturnValue([{ kill: scroll.triggerKill }])
})

describe("Scrollable", () => {
  it("renders its class, slot and forwarded attributes and initializes after the next tick", async () => {
    const wrapper = mount(Scrollable, {
      attrs: { id: "gallery-scroll" },
      props: { class: "custom" },
      slots: { default: "<p>Contents</p>" }
    })
    expect(wrapper.classes()).toEqual(["smooth-wrapper", "custom"])
    expect(wrapper.attributes("id")).toBe("gallery-scroll")
    expect(wrapper.get(".smooth-content p").text()).toBe("Contents")
    expect(scroll.create).not.toHaveBeenCalled()
    expect(wrapper.vm.getSmoother()).toBeNull()
    wrapper.vm.scrollTo(20)
    expect(scroll.scrollTo).not.toHaveBeenCalled()
    await nextTick()
    expect(scroll.registerPlugin).toHaveBeenCalledOnce()
    expect(scroll.create).toHaveBeenCalledExactlyOnceWith({
      content: wrapper.get(".smooth-content").element,
      effects: true,
      smooth: 2,
      smoothTouch: 0.1,
      wrapper: wrapper.element
    })
    expect(wrapper.vm.getSmoother()).toBe(scroll.create.mock.results[0]?.value)
  })

  it("passes smoothness options and delegates both immediate and smooth exposed scrolling", async () => {
    const wrapper = mount(Scrollable, { props: { smoothness: 3, smoothTouch: 0.4 } })
    await nextTick()
    expect(scroll.create).toHaveBeenCalledWith(
      expect.objectContaining({ smooth: 3, smoothTouch: 0.4 })
    )
    wrapper.vm.scrollTo(120)
    wrapper.vm.scrollTo("#target", false)
    const element = document.createElement("div")
    wrapper.vm.scrollTo(element, true)
    expect(scroll.scrollTo.mock.calls).toEqual([
      [120, true],
      ["#target", false],
      [element, true]
    ])
    wrapper.unmount()
    expect(scroll.kill).toHaveBeenCalledOnce()
    expect(scroll.getAll).toHaveBeenCalledOnce()
    expect(scroll.triggerKill).toHaveBeenCalledOnce()
  })
})
