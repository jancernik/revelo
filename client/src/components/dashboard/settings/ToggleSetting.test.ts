import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import Toggle from "#src/components/common/Toggle.vue"
import ToggleSetting from "#src/components/dashboard/settings/ToggleSetting.vue"

import { resetContract, settingInfo, track } from "./testFixtures"

const render = (
  currentValue: boolean,
  originalValue: boolean,
  defaultValue: boolean,
  isResetting = false
) =>
  track(
    mount(ToggleSetting, {
      global: { stubs: { Icon: true } },
      props: {
        currentValue,
        isResetting,
        originalValue,
        setting: { ...settingInfo, default: defaultValue, type: "toggle", value: originalValue }
      }
    })
  )

describe("ToggleSetting", () => {
  resetContract(render, true, false, false)

  it("emits the toggled boolean without changing the controlled value", async () => {
    const wrapper = render(false, false, false)
    await wrapper.get("input[type='checkbox']").setValue(true)
    expect(wrapper.emitted("update")).toEqual([[true]])
    expect(wrapper.getComponent(Toggle).props("modelValue")).toBe(false)
    await wrapper.setProps({ currentValue: true })
    await wrapper.get("input[type='checkbox']").setValue(false)
    expect(wrapper.emitted("update")).toEqual([[true], [false]])
  })

  it("does not disable the toggle while a reset is pending", async () => {
    const wrapper = render(true, false, false, true)
    expect(wrapper.get("input[type='checkbox']").attributes("disabled")).toBeUndefined()
    await wrapper.get("input[type='checkbox']").setValue(false)
    expect(wrapper.emitted("update")).toEqual([[false]])
  })
})
