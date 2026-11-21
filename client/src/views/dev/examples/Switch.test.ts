import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import SwitchExample from "#src/views/dev/examples/Switch.vue"

enableAutoUnmount(afterEach)

describe("Switch example", () => {
  it("mounts all six switches with their values, icons and disabled state", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(SwitchExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Text Labels",
      "Icon Only",
      "Text and Icons",
      "Alignment Tools",
      "Vertical Layout",
      "Disabled State"
    ])
    expect(wrapper.findAll(".switch")).toHaveLength(6)
    const checked = wrapper
      .findAll<HTMLInputElement>("input:checked")
      .map((item) => item.element.value)
    expect(checked).toEqual(["light", "grid", "create", "left", "auto", "enabled"])
    const vertical = wrapper.findAll(".switch.vertical")
    expect(vertical).toHaveLength(2)
    const disabled = wrapper.findAll(".switch.disabled")
    expect(disabled).toHaveLength(1)
    expect(disabled[0]?.findAll("input").every((item) => item.element.disabled)).toBe(true)
    expect(wrapper.text()).toContain("Light")
    expect(wrapper.text()).toContain("Dark")
    expect(wrapper.text()).toContain("Create")
    expect(error).not.toHaveBeenCalled()
  })
})
