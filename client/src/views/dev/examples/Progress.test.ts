import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ProgressExample from "#src/views/dev/examples/Progress.vue"

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, "random").mockReturnValue(0)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("Progress example", () => {
  it("mounts every group with fixed, animated and indeterminate bars and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(ProgressExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Different Values",
      "Animated Progress",
      "Loading Animation"
    ])
    const labels = wrapper.findAll(".progress-label").map((item) => item.text())
    expect(labels).toContain("0%")
    expect(labels).toContain("50%")
    expect(labels).toContain("100%")
    expect(labels.some((item) => item.startsWith("Animated ("))).toBe(true)
    expect(labels).toContain("Indeterminate Loading")
    expect(wrapper.findAllComponents({ name: "Progress" })).toHaveLength(5)
    wrapper.unmount()
    expect(error).not.toHaveBeenCalled()
  })

  it("animates the animated bar while mounted and stops advancing after unmount", () => {
    const wrapper = mount(ProgressExample, { global: { stubs: { Icon: true } } })
    const animated = () => wrapper.findAll(".progress-label")[1]?.text()
    vi.advanceTimersByTime(400)
    expect(animated()).not.toBe("Animated (0%)")
    wrapper.unmount()
    const stopped = animated()
    vi.advanceTimersByTime(2000)
    expect(wrapper.findAll(".progress-label")[1]?.text()).toBe(stopped)
  })
})
