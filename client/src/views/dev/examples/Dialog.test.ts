import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useDialog } from "#src/composables/useDialog"
import DialogExample from "#src/views/dev/examples/Dialog.vue"

enableAutoUnmount(afterEach)
afterEach(() => useDialog().hide())

describe("Dialog example", () => {
  it("mounts every group with its buttons and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(DialogExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Basic Dialog",
      "Confirmation Dialogs",
      "Special Behaviors",
      "Content Variations"
    ])
    expect(wrapper.findAll("button").map((item) => item.text().trim())).toEqual([
      "Show Basic Dialog",
      "Delete Account",
      "Save Changes",
      "Non-dismissible",
      "Multiple Actions",
      "Title Only",
      "Description Only"
    ])
    expect(wrapper.findAll("button")).toHaveLength(7)
    expect(error).not.toHaveBeenCalled()
  })

  it("opens the singleton dialog through the shared composable", async () => {
    const wrapper = mount(DialogExample, { global: { stubs: { Icon: true } } })
    await wrapper.findAll("button")[3]?.trigger("click")
    const { dialogState } = useDialog()
    expect(dialogState.isOpen).toBe(true)
    expect(dialogState.title).toBe("Processing")
    expect(dialogState.dismissible).toBe(false)
    expect(dialogState.actions.map((action) => action.name)).toEqual(["Force Close"])
    await wrapper.findAll("button")[4]?.trigger("click")
    expect(dialogState.title).toBe("Choose Action")
    expect(dialogState.dismissible).toBe(true)
    expect(dialogState.actions.map((action) => action.name)).toEqual([
      "Download",
      "Share",
      "Delete"
    ])
  })
})
