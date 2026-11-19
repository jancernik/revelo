import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"

import Toggle from "#src/components/common/Toggle.vue"

enableAutoUnmount(afterEach)

describe("Toggle", () => {
  it("defaults to unchecked without a label", () => {
    const wrapper = mount(Toggle)
    expect(wrapper.get("input").element.checked).toBe(false)
    expect(wrapper.find(".label-text").exists()).toBe(false)
    expect(wrapper.get(".slider").classes()).not.toContain("active")
    expect(wrapper.emitted()).toEqual({})
  })

  it("round trips checked changes through v-model with boolean payloads", async () => {
    const wrapper = mount(Toggle, {
      props: {
        label: "Enabled",
        modelValue: true,
        "onUpdate:modelValue": (value: boolean) => wrapper.setProps({ modelValue: value })
      }
    })
    expect(wrapper.get("input").element.checked).toBe(true)
    expect(wrapper.get(".slider").classes()).toContain("active")
    expect(wrapper.get(".label-text").text()).toBe("Enabled")
    await wrapper.get("input").setValue(false)
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]])
    expect(wrapper.props("modelValue")).toBe(false)
    await wrapper.get("input").setValue(true)
    expect(wrapper.emitted("update:modelValue")).toEqual([[false], [true]])
  })

  it("disables the native checkbox and styling without changing its value", () => {
    const wrapper = mount(Toggle, { props: { disabled: true, modelValue: true } })
    expect(wrapper.get("input").element.disabled).toBe(true)
    expect(wrapper.get("input").element.checked).toBe(true)
    expect(wrapper.get(".slider").classes()).toEqual(expect.arrayContaining(["active", "disabled"]))
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
  })
})
