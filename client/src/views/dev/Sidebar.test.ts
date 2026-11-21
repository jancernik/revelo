import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import Sidebar from "#src/views/dev/Sidebar.vue"

const components = [
  { id: "button", name: "Button" },
  { id: "toast", name: "Toast" }
]

describe("dev Sidebar", () => {
  it("renders names, marks the active section and emits navigate with the id", async () => {
    const wrapper = mount(Sidebar, { props: { activeSection: "toast", components } })
    const buttons = wrapper.findAll("button")
    expect(buttons.map((item) => item.text())).toEqual(["Button", "Toast"])
    expect(wrapper.findAll("li").map((item) => item.classes())).toEqual([[], ["active"]])
    await buttons[0]?.trigger("click")
    expect(wrapper.emitted("navigate")).toEqual([["button"]])
  })

  it("treats the active section as optional and defaults to none", () => {
    const wrapper = mount(Sidebar, { props: { components } })
    expect(wrapper.props("activeSection")).toBe("")
    expect(wrapper.findAll("li.active")).toHaveLength(0)
  })
})
