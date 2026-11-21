import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { IconName } from "#src/components/common/types"
import type { CompleteSetting, SettingValue } from "#src/types/models"

import Switch from "#src/components/common/Switch.vue"
import SwitchSetting from "#src/components/dashboard/settings/SwitchSetting.vue"

import { resetContract, settingInfo, track } from "./testFixtures"

type ObjectOption = {
  [key: string]: SettingValue
} & {
  icon?: IconName
  id?: number | string
  key?: number | string
  label?: number | string
  name?: number | string
  value?: number | string
}
type Option = ObjectOption | string
type OptionEntry =
  | ["icon", IconName]
  | ["id" | "key" | "label" | "name" | "value", number | string]
  | ["metadata", SettingValue]
type SwitchDefinition = Extract<CompleteSetting, { type: "switch" }> & {
  default: Option
  options?: Option[]
  value: Option
}
const render = (
  currentValue: Option,
  originalValue: Option,
  defaultValue: Option,
  isResetting = false
) =>
  renderSetting(
    {
      ...settingInfo,
      default: defaultValue,
      options: ["saved", "changed", "default"],
      type: "switch",
      value: originalValue
    },
    currentValue,
    originalValue,
    isResetting
  )
const renderSetting = (
  setting: SwitchDefinition,
  currentValue: Option = setting.value,
  originalValue: Option = setting.value,
  isResetting = false
) =>
  track(
    mount(SwitchSetting, {
      global: { stubs: { Icon: true } },
      props: { currentValue, isResetting, originalValue, setting }
    })
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("requestAnimationFrame", vi.fn())
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("SwitchSetting", () => {
  resetContract(render, "saved", "changed", "default")

  it("normalizes strings and emits the selected string through the native control", async () => {
    const wrapper = render("saved", "saved", "saved")
    expect(wrapper.getComponent(Switch).props("options")).toEqual([
      { label: "saved", value: "saved" },
      { label: "changed", value: "changed" },
      { label: "default", value: "default" }
    ])
    await wrapper.findAll("input")[1].setValue()
    expect(wrapper.emitted("update")).toEqual([["changed"]])
  })

  it("keeps fallback order, original option identity and JSON metadata on updates", async () => {
    const options: Option[] = [
      Object.fromEntries<SettingValue>([
        ["icon", "Sun"],
        ["label", "Label"],
        ["name", "Name"],
        ["value", "value"],
        ["id", "id"],
        ["key", "key"],
        ["metadata", { nested: [1, true] }]
      ] satisfies OptionEntry[]),
      Object.fromEntries<SettingValue>([
        ["name", "Name fallback"],
        ["id", "id"]
      ] satisfies OptionEntry[]),
      { key: "key" },
      Object.fromEntries<SettingValue>([
        ["value", 0],
        ["id", 7],
        ["key", "unused"],
        ["label", ""],
        ["name", ""]
      ] satisfies OptionEntry[]),
      { label: 42, value: 42 },
      {}
    ]
    const wrapper = renderSetting({
      ...settingInfo,
      default: "value",
      options,
      type: "switch",
      value: options[0]
    })
    const control = wrapper.getComponent(Switch)
    expect(control.props("options")).toEqual([
      { icon: "Sun", label: "Label", value: "value" },
      { icon: undefined, label: "Name fallback", value: "id" },
      { icon: undefined, label: "key", value: "key" },
      { icon: undefined, label: 7, value: 7 },
      { icon: undefined, label: 42, value: 42 },
      { icon: undefined, label: undefined, value: undefined }
    ])
    expect(control.props("modelValue")).toBe("value")
    await wrapper.get(".switch").trigger("keydown", { key: "ArrowRight" })
    expect(wrapper.emitted("update")?.[0]?.[0]).toBe(wrapper.props("setting").options?.[1])
    control.vm.$emit("update:modelValue", "value")
    expect(wrapper.emitted("update")?.[1]?.[0]).toBe(wrapper.props("setting").options?.[0])
    control.vm.$emit("update:modelValue", "unknown")
    expect(wrapper.emitted("update")?.[2]?.[0]).toBe("unknown")
  })

  it("keeps raw numeric keyboard values but native changes emit strings and miss numeric lookup", async () => {
    const options = [{ value: 1 }, { value: 2 }]
    const wrapper = renderSetting({
      ...settingInfo,
      default: options[0],
      options,
      type: "switch",
      value: options[0]
    })
    await wrapper.get(".switch").trigger("keydown", { key: "ArrowRight" })
    expect(wrapper.emitted("update")?.[0]?.[0]).toBe(wrapper.props("setting").options?.[1])
    await wrapper.findAll("input")[1].setValue()
    expect(wrapper.emitted("update")?.[1]?.[0]).toBe("2")
  })

  it("retains falsy identifier fallbacks, mount selection, and undefined lookup", () => {
    const first = Object.fromEntries<SettingValue>([
      ["value", 0],
      ["id", 7]
    ] satisfies OptionEntry[])
    const wrapper = renderSetting({
      ...settingInfo,
      default: first,
      options: [first, {}],
      type: "switch",
      value: { key: 0 }
    })
    const control = wrapper.getComponent(Switch)
    expect(control.props("modelValue")).toBe(0)
    expect(wrapper.emitted("update")?.[0]?.[0]).toBe(wrapper.props("setting").options?.[0])
    control.vm.$emit("update:modelValue", undefined)
    expect(wrapper.emitted("update")?.[1]?.[0]).toBe(wrapper.props("setting").options?.[1])
  })

  it("renders no choices without options and passes unmatched values through", () => {
    const wrapper = renderSetting({
      ...settingInfo,
      default: "saved",
      type: "switch",
      value: "saved"
    })
    expect(wrapper.getComponent(Switch).props("options")).toEqual([])
    expect(wrapper.find(".switch").exists()).toBe(false)
    wrapper.getComponent(Switch).vm.$emit("update:modelValue", "missing")
    expect(wrapper.emitted("update")).toEqual([["missing"]])
  })

  it("compares objects by JSON including field order for current, original and default", () => {
    const saved = Object.fromEntries<SettingValue>([
      ["value", "saved"],
      ["label", "Saved"]
    ] satisfies OptionEntry[])
    expect(
      render({ ...saved }, saved, { ...saved })
        .find("button[title^='Reset']")
        .exists()
    ).toBe(false)
    expect(
      render({ label: "Saved", value: "saved" }, saved, saved)
        .find("button[title$='saved value']")
        .exists()
    ).toBe(true)
    expect(
      render(saved, saved, { label: "Saved", value: "saved" })
        .find("button[title$='default value']")
        .exists()
    ).toBe(true)
  })

  it("does not disable the switch while resetting", () => {
    const wrapper = render("changed", "saved", "default", true)
    expect(wrapper.getComponent(Switch).props("disabled")).toBe(false)
  })
})
