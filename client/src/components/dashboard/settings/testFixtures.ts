import type { VueWrapper } from "@vue/test-utils"

import { afterEach, describe, expect, it } from "vitest"

import { useDialog } from "#src/composables/useDialog"

export const settingInfo = {
  category: "Interface",
  description: "Controls the example setting",
  name: "Example"
}

const wrappers: VueWrapper[] = []
export const track = <Wrapper extends VueWrapper>(wrapper: Wrapper): Wrapper => {
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  useDialog().hide()
})

export function resetContract<Value>(
  render: (
    current: Value,
    original: Value,
    defaultValue: Value,
    isResetting?: boolean
  ) => VueWrapper,
  saved: Value,
  changed: Value,
  defaultValue: Value
) {
  describe("setting information and reset actions", () => {
    it("renders information and hides resets when current, saved and default match", () => {
      const wrapper = render(saved, saved, saved)
      expect(wrapper.get(".name").text()).toBe(settingInfo.name)
      expect(wrapper.get(".description").text()).toBe(settingInfo.description)
      expect(wrapper.find("button[title^='Reset']").exists()).toBe(false)
      expect(wrapper.emitted("reset")).toBeUndefined()
      expect(wrapper.emitted("reset-default")).toBeUndefined()
    })

    it("prioritizes reset-to-saved even when current is the default and emits no payload", async () => {
      const wrapper = render(changed, saved, changed)
      const button = wrapper.get("button[title='Reset Example to saved value']")
      expect(button.attributes("disabled")).toBeUndefined()
      expect(wrapper.find("button[title='Reset Example to default value']").exists()).toBe(false)
      await button.trigger("click")
      expect(wrapper.emitted("reset")).toEqual([[]])
      expect(useDialog().dialogState.isOpen).toBe(false)
      expect(wrapper.emitted("reset-default")).toBeUndefined()
    })

    it("opens the default confirmation and emits only when its Reset action runs", async () => {
      const wrapper = render(saved, saved, defaultValue)
      await wrapper.get("button[title='Reset Example to default value']").trigger("click")
      const { dialogState } = useDialog()
      expect(dialogState.isOpen).toBe(true)
      expect(dialogState.title).toBe("Reset Example")
      expect(dialogState.description).toBe(
        "Are you sure you want to reset the setting to its default value?"
      )
      expect(dialogState.dismissible).toBe(true)
      expect(dialogState.useX).toBe(false)
      expect(dialogState.actions).toHaveLength(1)
      const action = dialogState.actions[0]
      expect(action.name).toBe("Reset")
      expect(action.color).toBe("primary")
      expect(typeof action.callback).toBe("function")
      expect(wrapper.emitted("reset-default")).toBeUndefined()
      action.callback?.()
      expect(wrapper.emitted("reset-default")).toEqual([[]])
      expect(wrapper.emitted("reset")).toBeUndefined()
    })

    it("disables each reset action while resetting", async () => {
      const changedWrapper = render(changed, saved, defaultValue, true)
      const savedButton = changedWrapper.get("button[title='Reset Example to saved value']")
      expect(savedButton.attributes("disabled")).toBeDefined()
      await savedButton.trigger("click")
      expect(changedWrapper.emitted("reset")).toBeUndefined()
      const savedWrapper = render(saved, saved, defaultValue, true)
      const defaultButton = savedWrapper.get("button[title='Reset Example to default value']")
      expect(defaultButton.attributes("disabled")).toBeDefined()
      await defaultButton.trigger("click")
      expect(useDialog().dialogState.isOpen).toBe(false)
    })
  })
}
