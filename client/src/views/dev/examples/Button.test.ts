import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import ButtonExample from "#src/views/dev/examples/Button.vue"

enableAutoUnmount(afterEach)

describe("Button example", () => {
  it("mounts with every group and key control and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(ButtonExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Basic Buttons",
      "With Icons",
      "Icon Only",
      "States"
    ])
    const buttons = wrapper.findAll("button")
    expect(buttons.map((item) => item.text().trim())).toEqual([
      "Primary Button",
      "Secondary Button",
      "Add Item",
      "Download",
      "",
      "",
      "Disabled",
      "Disabled Secondary"
    ])
    expect(buttons.filter((item) => item.attributes("disabled") !== undefined).length).toBe(2)
    expect(error).not.toHaveBeenCalled()
  })
})
