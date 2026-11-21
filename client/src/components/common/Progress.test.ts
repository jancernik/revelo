import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import Progress from "#src/components/common/Progress.vue"

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

describe("Progress", () => {
  it("is indeterminate by default, for null and for the explicit flag", async () => {
    const wrapper = mount(Progress)
    expect(wrapper.classes()).toContain("indeterminate")
    expect(wrapper.element.style.getPropertyValue("--progress-value")).toBe("0")
    await wrapper.setProps({ value: 50 })
    expect(wrapper.classes()).not.toContain("indeterminate")
    await wrapper.setProps({ indeterminate: true })
    expect(wrapper.classes()).toContain("indeterminate")
    expect(wrapper.element.style.getPropertyValue("--progress-value")).toBe("0")
    await wrapper.setProps({ indeterminate: false, value: undefined })
    expect(wrapper.classes()).toContain("indeterminate")
    const explicitNull = mount(Progress, { attrs: { value: null } })
    expect(explicitNull.classes()).toContain("indeterminate")
  })

  it("warns on out-of-range values without clamping the rendered fraction", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const wrapper = mount(Progress, { props: { value: 125 } })
    expect(warn.mock.calls[0]?.[0]).toContain('custom validator check failed for prop "value"')
    expect(wrapper.element.style.getPropertyValue("--progress-value")).toBe("1.25")
  })

  it.each([
    [0, "0"],
    [100, "1"],
    [24.49, "0.24"],
    [24.5, "0.25"],
    ["67.6", "0.68"],
    ["0", "0"]
  ])("rounds %s to the CSS fraction %s", (value, fraction) => {
    const wrapper = mount(Progress, { props: { value } })
    expect(wrapper.classes()).not.toContain("indeterminate")
    expect(wrapper.element.style.getPropertyValue("--progress-value")).toBe(fraction)
  })
})
