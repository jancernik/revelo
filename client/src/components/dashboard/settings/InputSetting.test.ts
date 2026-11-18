import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import type { CompleteSetting } from "#src/types/models"

import Input from "#src/components/common/Input.vue"
import InputSetting from "#src/components/dashboard/settings/InputSetting.vue"

import { resetContract, settingInfo, track } from "./testFixtures"

type InputDefinition = Extract<CompleteSetting, { type: "decimal" | "integer" | "text" }>
const render = (
  currentValue: number | string,
  originalValue: number | string,
  defaultValue: number,
  isResetting = false
) =>
  renderSetting(
    { ...settingInfo, default: defaultValue, type: "integer", value: 1 },
    currentValue,
    originalValue,
    isResetting
  )
const renderSetting = (
  setting: InputDefinition,
  currentValue: number | string = setting.value,
  originalValue: number | string = setting.value,
  isResetting = false
) =>
  track(
    mount(InputSetting, {
      global: { stubs: { Icon: true } },
      props: { currentValue, isResetting, originalValue, setting }
    })
  )

describe("InputSetting", () => {
  resetContract(render, 1, 2, 3)

  it.each([
    ["12.9", 12],
    ["-3.5", -3],
    ["7suffix", 7],
    ["not a number", "not a number"],
    ["NaN", "NaN"],
    ["", ""]
  ])("parses integer input %s with its original raw fallback", async (raw, expected) => {
    const wrapper = render(1, 1, 1)
    await wrapper.get("input").setValue(raw)
    expect(wrapper.emitted("update")).toEqual([[expected]])
  })

  it.each([
    ["12.95", 12.95],
    ["-3.5suffix", -3.5],
    ["NaN", "NaN"],
    ["", ""]
  ])("parses decimal input %s with its original raw fallback", async (raw, expected) => {
    const wrapper = renderSetting({ ...settingInfo, default: 1.5, type: "decimal", value: 1.5 })
    await wrapper.get("input").setValue(raw)
    expect(wrapper.emitted("update")).toEqual([[expected]])
  })

  it("passes text through a multiline input without numeric parsing", async () => {
    const wrapper = renderSetting({ ...settingInfo, default: "", type: "text", value: "saved" })
    expect(wrapper.find("input").exists()).toBe(false)
    expect(wrapper.getComponent(Input).props("multiline")).toBe(true)
    expect(wrapper.get("textarea").attributes("step")).toBe("1")
    await wrapper.get("textarea").setValue("12.5\nsecond line")
    expect(wrapper.emitted("update")).toEqual([["12.5\nsecond line"]])
  })

  it("retains native integer/decimal type attributes, steps and controlled raw drafts", async () => {
    const wrapper = render("raw", 1, 1, true)
    expect(wrapper.get("input").attributes("type")).toBe("integer")
    expect(wrapper.get("input").attributes("step")).toBe("1")
    expect(wrapper.get("input").attributes("disabled")).toBeUndefined()
    expect(wrapper.getComponent(Input).props("modelValue")).toBe("raw")
    await wrapper.setProps({
      setting: { ...settingInfo, default: 1.5, type: "decimal", value: 1.5 }
    })
    expect(wrapper.get("input").attributes("type")).toBe("decimal")
    expect(wrapper.get("input").attributes("step")).toBe("0.01")
    expect(wrapper.getComponent(Input).props("multiline")).toBe(false)
    await wrapper.get("input").setValue("new raw")
    expect(wrapper.emitted("update")).toEqual([["new raw"]])
    expect(wrapper.props("currentValue")).toBe("raw")
  })

  it("uses strict equality for number/string drafts and NaN", () => {
    expect(render("1", 1, 1).find("button[title$='saved value']").exists()).toBe(true)
    expect(render(NaN, NaN, 1).find("button[title$='saved value']").exists()).toBe(true)
  })
})
