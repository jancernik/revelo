import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import ToggleExample from "#src/views/dev/examples/Toggle.vue"

enableAutoUnmount(afterEach)

describe("Toggle example", () => {
  it("mounts every group with checked and disabled states and without console errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(ToggleExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual(["Basic", "Disabled"])
    const toggles = wrapper.findAll<HTMLInputElement>("input[type=checkbox]")
    expect(toggles).toHaveLength(4)
    expect(toggles.map((item) => item.element.checked)).toEqual([true, true, false, true])
    expect(toggles.filter((item) => item.element.disabled).length).toBe(2)
    expect(wrapper.text()).toContain("With label")
    expect(wrapper.text()).toContain("Disabled (Off)")
    expect(wrapper.text()).toContain("Disabled (On)")
    await toggles[0]?.setValue(false)
    expect(toggles[0]?.element.checked).toBe(false)
    expect(error).not.toHaveBeenCalled()
  })
})
