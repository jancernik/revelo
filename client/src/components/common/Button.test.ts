import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"

enableAutoUnmount(afterEach)

const global = { stubs: { Icon: true } }

describe("Button", () => {
  it("defaults to primary and renders the slot only when not iconOnly", async () => {
    const wrapper = mount(Button, { global, slots: { default: "Save" } })
    expect(wrapper.classes()).toContain("color-primary")
    expect(wrapper.get(".content").text()).toBe("Save")
    expect(wrapper.findComponent(Icon).exists()).toBe(false)
    await wrapper.setProps({ color: "secondary", icon: "Plus", iconOnly: true })
    expect(wrapper.classes()).toContain("color-secondary")
    expect(wrapper.find(".content").exists()).toBe(false)
    expect(wrapper.getComponent(Icon).props()).toMatchObject({ name: "Plus", size: 16 })
  })

  it("passes native attributes and listeners through, including disabled", async () => {
    const onClick = vi.fn()
    const wrapper = mount(Button, {
      attrs: { "aria-label": "Save", onClick, type: "submit" },
      global
    })
    expect(wrapper.element.tagName).toBe("BUTTON")
    expect(wrapper.attributes("type")).toBe("submit")
    expect(wrapper.attributes("aria-label")).toBe("Save")
    expect(wrapper.find(".content").exists()).toBe(false)
    await wrapper.trigger("click")
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent)
    const disabled = mount(Button, { attrs: { disabled: true, onClick }, global })
    expect(disabled.element.disabled).toBe(true)
    await disabled.trigger("click")
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
