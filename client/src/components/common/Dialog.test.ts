import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Button from "#src/components/common/Button.vue"
import Dialog from "#src/components/common/Dialog.vue"
import Icon from "#src/components/common/Icon.vue"
import { useDialog } from "#src/composables/useDialog"

enableAutoUnmount(afterEach)
const dialog = useDialog()
const setup = () => mount(Dialog, { global: { stubs: { Icon: true } } })
const escape = () => {
  const event = new KeyboardEvent("keydown", { cancelable: true, key: "Escape" })
  window.dispatchEvent(event)
  return event
}
beforeEach(() => dialog.hide())
afterEach(async () => {
  dialog.hide()
  await nextTick()
  vi.restoreAllMocks()
})

describe("Dialog", () => {
  it("is hidden initially, renders title and HTML description on opening", async () => {
    const wrapper = setup()
    expect(wrapper.find(".dialog-overlay").exists()).toBe(false)
    dialog.show({ description: "A <strong>message</strong>", title: "Confirm" })
    await nextTick()
    expect(wrapper.get("h5").text()).toBe("Confirm")
    expect(wrapper.get("p strong").text()).toBe("message")
    expect(wrapper.getComponent(Button).text()).toBe("Cancel")
    await wrapper.get(".dialog").trigger("click")
    expect(dialog.dialogState.isOpen).toBe(true)
  })

  it("swallows only the first overlay click after each opening", async () => {
    const wrapper = setup()
    for (let i = 0; i < 2; i++) {
      dialog.show()
      await nextTick()
      await wrapper.get(".dialog-overlay").trigger("click")
      expect(dialog.dialogState.isOpen).toBe(true)
      await wrapper.get(".dialog-overlay").trigger("click")
      expect(dialog.dialogState.isOpen).toBe(false)
    }
  })

  it("allows a pointerdown to clear the opening click guard", async () => {
    const wrapper = setup()
    dialog.show()
    await nextTick()
    await wrapper.get(".dialog-overlay").trigger("pointerdown")
    await wrapper.get(".dialog-overlay").trigger("click")
    expect(dialog.dialogState.isOpen).toBe(false)
  })

  it("handles Escape only when dismissible and removes the listener on hide", async () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const wrapper = setup()
    dialog.show({ dismissible: false })
    await nextTick()
    expect(escape().defaultPrevented).toBe(false)
    await wrapper.get(".dialog-overlay").trigger("pointerdown")
    await wrapper.get(".dialog-overlay").trigger("click")
    expect(dialog.dialogState.isOpen).toBe(true)
    expect(wrapper.findComponent(Button).exists()).toBe(false)
    dialog.show()
    await nextTick()
    const other = new KeyboardEvent("keydown", { cancelable: true, key: "Enter" })
    window.dispatchEvent(other)
    expect(other.defaultPrevented).toBe(false)
    expect(dialog.dialogState.isOpen).toBe(true)
    expect(escape().defaultPrevented).toBe(true)
    await nextTick()
    expect(dialog.dialogState.isOpen).toBe(false)
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function))
    expect(escape().defaultPrevented).toBe(false)
  })

  it("calls action before hiding and passes button defaults and explicit props", async () => {
    const wrapper = setup()
    const callback = vi.fn(() => expect(dialog.dialogState.isOpen).toBe(true))
    dialog.show({
      actions: [
        { callback, name: "Save" },
        { color: "secondary", icon: "Plus", name: "Other" }
      ]
    })
    await nextTick()
    const buttons = wrapper.findAllComponents(Button)
    expect(buttons[1]?.props("color")).toBe("primary")
    expect(buttons[2]?.props()).toMatchObject({ color: "secondary", icon: "Plus" })
    await buttons[1]?.trigger("click")
    expect(callback).toHaveBeenCalledOnce()
    expect(dialog.dialogState.isOpen).toBe(false)
    dialog.show({ actions: [{ name: "Done" }] })
    await nextTick()
    await wrapper.findAllComponents(Button)[1]?.trigger("click")
    expect(dialog.dialogState.isOpen).toBe(false)
  })

  it("supports Cancel or a dismissible close X with useX", async () => {
    const wrapper = setup()
    dialog.show()
    await nextTick()
    expect(wrapper.findComponent(Icon).exists()).toBe(false)
    await wrapper.getComponent(Button).trigger("click")
    expect(dialog.dialogState.isOpen).toBe(false)
    dialog.show({ useX: true })
    await nextTick()
    expect(wrapper.find(".dialog-footer").exists()).toBe(false)
    expect(wrapper.findComponent(Button).exists()).toBe(false)
    expect(wrapper.getComponent(Icon).props()).toMatchObject({ name: "X", size: "20" })
    await wrapper.getComponent(Icon).trigger("click")
    expect(dialog.dialogState.isOpen).toBe(false)
    dialog.show({ dismissible: false, useX: true })
    await nextTick()
    expect(wrapper.findComponent(Icon).exists()).toBe(false)
  })

  it("removes its key listener when unmounted while open", async () => {
    const add = vi.spyOn(window, "addEventListener")
    const remove = vi.spyOn(window, "removeEventListener")
    const wrapper = setup()
    dialog.show()
    await nextTick()
    const listener = add.mock.calls.find(([type]) => type === "keydown")?.[1]
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith("keydown", listener)
    expect(escape().defaultPrevented).toBe(false)
    expect(dialog.dialogState.isOpen).toBe(true)
  })
})
