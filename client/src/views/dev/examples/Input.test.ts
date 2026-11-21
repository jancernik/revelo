import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import InputExample from "#src/views/dev/examples/Input.vue"

enableAutoUnmount(afterEach)

describe("Input example", () => {
  it("mounts every group with key controls and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(InputExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Basic Input",
      "Input Types",
      "With Icons",
      "With Units",
      "States"
    ])
    expect(wrapper.findAll("input")).toHaveLength(9)
    expect(wrapper.find("textarea").exists()).toBe(false)
    const labels = wrapper.findAll("label").map((item) => item.text())
    for (const label of ["Full Name", "Email Address", "Password", "Price", "Weight", "Email"]) {
      expect(labels).toContain(label)
    }
    expect(wrapper.findAll("input").map((item) => item.attributes("type"))).toEqual([
      "text",
      "email",
      "password",
      "text",
      "text",
      "text",
      "text",
      "text",
      "text"
    ])
    expect(wrapper.findAll(".input-unit").map((item) => item.text())).toEqual(["USD", "kg"])
    expect(wrapper.text()).toContain("Please enter a valid email address")
    const disabled = wrapper.findAll("input").at(-1)
    expect(disabled?.element.disabled).toBe(true)
    expect(disabled?.attributes("placeholder")).toBe("This input is disabled")
    expect(error).not.toHaveBeenCalled()
  })
})
