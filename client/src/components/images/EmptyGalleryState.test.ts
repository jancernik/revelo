import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import EmptyGalleryState from "#src/components/images/EmptyGalleryState.vue"

const animation = vi.hoisted(() => ({
  fromTo: vi.fn(),
  random: vi.fn(),
  set: vi.fn(),
  to: vi.fn()
}))
vi.mock("gsap", () => ({ gsap: { ...animation, utils: { random: animation.random } } }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  animation.random.mockImplementation((min: number, max: number) => (min + max) / 2)
})
afterEach(() => document.body.replaceChildren())

describe("EmptyGalleryState", () => {
  it("renders the empty message, hint and icons", () => {
    const wrapper = mount(EmptyGalleryState, { global: { stubs: { Icon: true } } })
    expect(wrapper.get("h2").text()).toBe("Hmm, nothing here...")
    expect(wrapper.get("p").text()).toBe("Try being more specific or using different keywords")
    expect(wrapper.findAll(".floating-icon")).toHaveLength(5)
    expect(wrapper.get(".main-icon").attributes("name")).toBe("Ghost")
    expect(animation.to).not.toHaveBeenCalled()
  })

  it("positions attached floating icons in a circle and starts their entrance and repeat animations", () => {
    const wrapper = mount(EmptyGalleryState, {
      attachTo: document.body,
      global: { stubs: { Icon: true } }
    })
    const icons = wrapper.findAll(".floating-icon")
    expect(animation.set).toHaveBeenCalledTimes(5)
    expect(animation.set).toHaveBeenCalledWith(icons[0]?.element, { x: 75, y: 0 })
    expect(animation.fromTo).toHaveBeenCalledWith(
      [".main-icon", ".empty-title", ".empty-description"],
      { opacity: 0, y: -6 },
      expect.objectContaining({ duration: 0.5, opacity: 1, stagger: 0.1, y: 0 })
    )
    expect(animation.to).toHaveBeenCalledTimes(5)
    expect(animation.to).toHaveBeenCalledWith(
      icons[1]?.element,
      expect.objectContaining({
        delay: 0.4,
        duration: 3.75,
        ease: "sine.iOnut",
        repeat: -1,
        yoyo: true
      })
    )
  })
})
