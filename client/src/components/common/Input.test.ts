import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Icon from "#src/components/common/Icon.vue"
import Input from "#src/components/common/Input.vue"

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

const global = { stubs: { Icon: true } }

describe("Input", () => {
  it("renders native defaults and no optional decorations", () => {
    const wrapper = mount(Input, { global })
    expect(wrapper.get("input").attributes("type")).toBe("text")
    expect(wrapper.get("input").element.value).toBe("")
    expect(wrapper.get("input").element.disabled).toBe(false)
    expect(wrapper.find("textarea").exists()).toBe(false)
    expect(wrapper.find("label").exists()).toBe(false)
    expect(wrapper.findComponent(Icon).exists()).toBe(false)
    expect(wrapper.find(".input-unit").exists()).toBe(false)
    expect(wrapper.find(".description").exists()).toBe(false)
    expect(wrapper.get(".input-container").attributes("style")).toBeUndefined()
  })

  it.each([false, true])(
    "round trips native input strings with multiline=%s",
    async (multiline) => {
      const onBlur = vi.fn()
      const wrapper = mount(Input, {
        attrs: { "aria-label": "Value", maxlength: 20, name: "value", onBlur },
        global,
        props: {
          label: "Value",
          modelValue: 12,
          multiline,
          "onUpdate:modelValue": (value: string) => wrapper.setProps({ modelValue: value }),
          placeholder: "Enter value"
        }
      })
      const native = wrapper.get(multiline ? "textarea" : "input")
      expect(native.element.value).toBe("12")
      expect(native.attributes()).toMatchObject({
        "aria-label": "Value",
        maxlength: "20",
        name: "value",
        placeholder: "Enter value"
      })
      expect(wrapper.get("label").text()).toBe("Value")
      if (multiline) expect(native.attributes("rows")).toBe("3")
      await native.setValue("changed")
      expect(wrapper.emitted("update:modelValue")).toEqual([["changed"]])
      expect(wrapper.props("modelValue")).toBe("changed")
      await native.setValue("")
      expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([""])
      await native.trigger("blur")
      expect(onBlur).toHaveBeenCalledTimes(1)
      await wrapper.setProps({ disabled: true, rows: 6 })
      expect(native.element.disabled).toBe(true)
      expect(wrapper.get(".input-container").classes()).toContain("is-disabled")
      if (multiline) {
        expect(native.attributes("rows")).toBe("6")
        expect(wrapper.get(".input-container").classes()).toContain("is-multiline")
      }
    }
  )

  it("renders nullable model values from metadata as an empty native value", () => {
    const wrapper = mount(Input, { attrs: { modelValue: null }, global })
    expect(wrapper.get("input").element.value).toBe("")
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
  })

  it("gives error precedence over description", async () => {
    const wrapper = mount(Input, { global, props: { description: "Hint", error: "Invalid" } })
    expect(wrapper.get(".error").text()).toBe("Invalid")
    expect(wrapper.find(".description").exists()).toBe(false)
    expect(wrapper.get(".input-container").classes()).toContain("has-error")
    await wrapper.setProps({ error: "" })
    expect(wrapper.get(".description").text()).toBe("Hint")
    expect(wrapper.get(".input-container").classes()).not.toContain("has-error")
  })

  it("positions icons and units and measures the unit once on mount", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(36)
    const wrapper = mount(Input, { global, props: { icon: "Search", unit: "USD" } })
    await nextTick()
    expect(wrapper.getComponent(Icon).props()).toMatchObject({ name: "Search", size: 16 })
    expect(wrapper.getComponent(Icon).classes()).toContain("icon-left")
    expect(wrapper.get(".input-unit").classes()).toContain("unit-right")
    expect(wrapper.get(".input-container").classes()).toEqual(
      expect.arrayContaining(["has-icon-left", "has-unit-right"])
    )
    expect(
      wrapper.get<HTMLDivElement>(".input-container").element.style.getPropertyValue("--unit-width")
    ).toBe("36px")
    await wrapper.setProps({ iconPosition: "right", unitPosition: "left" })
    expect(wrapper.getComponent(Icon).classes()).toContain("icon-right")
    expect(wrapper.get(".input-unit").classes()).toContain("unit-left")
    expect(wrapper.get(".input-container").classes()).toEqual(
      expect.arrayContaining(["has-icon-right", "has-unit-left"])
    )
  })

  it("skips the deferred unit measurement after an immediate unmount", async () => {
    const wrapper = mount(Input, { global, props: { unit: "USD" } })
    const container = wrapper.get<HTMLDivElement>(".input-container").element
    wrapper.unmount()
    await nextTick()
    expect(container.style.getPropertyValue("--unit-width")).toBe("")
  })

  it("does not measure a unit added after mount", async () => {
    const wrapper = mount(Input, { global })
    await wrapper.setProps({ unit: "kg" })
    expect(
      wrapper.get<HTMLDivElement>(".input-container").element.style.getPropertyValue("--unit-width")
    ).toBe("")
  })
})
