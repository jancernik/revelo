import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Icon from "#src/components/common/Icon.vue"
import Switch from "#src/components/common/Switch.vue"

enableAutoUnmount(afterEach)

const options = [
  { value: "one" },
  { label: "Second", value: "two" },
  { icon: "Plus", value: "three" }
] as const
const setup = (modelValue: null | number | string = "one", vertical = false) =>
  mount(Switch, {
    attrs: { "aria-label": "Mode", modelValue },
    global: { stubs: { Icon: true } },
    props: { options: [...options], vertical }
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(40)
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(20)
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("Switch", () => {
  it("renders nothing with no options and emits nothing", () => {
    const wrapper = mount(Switch)
    expect(wrapper.find(".switch").exists()).toBe(false)
    expect(wrapper.emitted()).toEqual({})
  })

  it.each([null, "", 0])("emits the first option on mount for falsy %s", (modelValue) => {
    const wrapper = setup(modelValue)
    expect(wrapper.emitted("update:modelValue")).toEqual([["one"]])
  })

  it("renders labels, fallback values, icons and native checked state", async () => {
    const wrapper = setup("two")
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
    expect(wrapper.attributes()).toMatchObject({ "aria-label": "Mode", tabindex: "0" })
    expect(wrapper.findAll(".value").map((item) => item.text())).toEqual(["one", "Second", ""])
    expect(wrapper.getComponent(Icon).props()).toMatchObject({ name: "Plus", size: 16 })
    expect(wrapper.findAll("input").map((input) => input.element.checked)).toEqual([
      false,
      true,
      false
    ])
    await wrapper.findAll("input")[2]?.setValue(true)
    expect(wrapper.emitted("update:modelValue")).toEqual([["three"]])
    expect(wrapper.props("modelValue")).toBe("two")
    await wrapper.setProps({ modelValue: "three" })
    expect(wrapper.findAll("input")[2]?.element.checked).toBe(true)
  })

  it.each([false, true])("cycles and wraps keyboard values with vertical=%s", async (vertical) => {
    const wrapper = setup("one", vertical)
    const backward = vertical ? "ArrowUp" : "ArrowLeft"
    const forward = vertical ? "ArrowDown" : "ArrowRight"
    const key = (name: string) => {
      const event = new KeyboardEvent("keydown", { cancelable: true, key: name })
      wrapper.element.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(key(backward)).toBe(true)
    expect(wrapper.emitted("update:modelValue")).toEqual([["three"]])
    await wrapper.setProps({ modelValue: "three" })
    expect(key(forward)).toBe(true)
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual(["one"])
    expect(key("Enter")).toBe(true)
    expect(wrapper.emitted("update:modelValue")?.[2]).toEqual(["one"])
    await wrapper.setProps({ modelValue: "one" })
    key(forward)
    expect(wrapper.emitted("update:modelValue")?.[3]).toEqual(["two"])
    await wrapper.setProps({ modelValue: "two" })
    key(backward)
    expect(wrapper.emitted("update:modelValue")?.[4]).toEqual(["one"])
    expect(key(vertical ? "ArrowRight" : "ArrowDown")).toBe(false)
    expect(key("Space")).toBe(false)
    expect(wrapper.emitted("update:modelValue")).toHaveLength(5)
  })

  it("round trips radio and keyboard updates through v-model", async () => {
    const wrapper = mount(Switch, {
      global: { stubs: { Icon: true } },
      props: {
        modelValue: "one",
        "onUpdate:modelValue": (value: string) => wrapper.setProps({ modelValue: value }),
        options: [...options]
      }
    })
    await wrapper.findAll("input")[1]?.setValue(true)
    expect(wrapper.props("modelValue")).toBe("two")
    await wrapper.trigger("keydown", { key: "Enter" })
    expect(wrapper.props("modelValue")).toBe("three")
    expect(wrapper.findAll("input")[2]?.element.checked).toBe(true)
  })

  it("disables focus, native radios and key handling", async () => {
    const wrapper = setup()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.classes()).toContain("disabled")
    expect(wrapper.attributes("tabindex")).toBe("-1")
    expect(wrapper.findAll("input").every((input) => input.element.disabled)).toBe(true)
    await wrapper.trigger("keydown", { key: "Enter" })
    await wrapper.trigger("keydown", { key: "ArrowLeft" })
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
  })

  it.each([false, true])(
    "updates measured indicator and initial transition with vertical=%s",
    async (vertical) => {
      const wrapper = setup("one", vertical)
      await nextTick()
      vi.advanceTimersByTime(0)
      const style = wrapper.get<HTMLDivElement>(".switch").element.style
      expect(style.getPropertyValue("--transition")).toBe("none")
      expect(style.getPropertyValue("--indicator-width")).toBe(
        vertical ? "calc(100% - 0.25rem)" : "40px"
      )
      expect(style.getPropertyValue("--indicator-height")).toBe(
        vertical ? "20px" : "calc(100% - 0.25rem)"
      )
      vi.advanceTimersByTime(20)
      expect(style.getPropertyValue("--transition")).toBe("")
      await wrapper.setProps({ modelValue: "three" })
      await nextTick()
      expect(style.getPropertyValue("--indicator-x")).toBe(vertical ? "0px" : "80px")
      expect(style.getPropertyValue("--indicator-y")).toBe(vertical ? "40px" : "0px")
      await wrapper.setProps({ modelValue: "missing" })
      await nextTick()
      expect(style.getPropertyValue("--indicator-x")).toBe(vertical ? "0px" : "80px")
    }
  )

  it("can unmount before the deferred initial layout", async () => {
    const wrapper = setup()
    await nextTick()
    wrapper.unmount()
    expect(() => vi.runAllTimers()).not.toThrow()
  })
})
