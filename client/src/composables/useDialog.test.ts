import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDialog } from "#src/composables/useDialog"

beforeEach(() => useDialog().hide())
afterEach(() => useDialog().hide())

describe("useDialog", () => {
  it("opens with defaults", () => {
    const { dialogState, show } = useDialog()
    show()
    expect(dialogState).toEqual({
      actions: [],
      description: "",
      dismissible: true,
      isOpen: true,
      title: "",
      useX: false
    })
  })

  it("shares the configured dialog and honors dismissible false", () => {
    const callback = vi.fn()
    const { dialogState, show } = useDialog()
    show({
      actions: [{ callback, color: "primary", icon: "Check", name: "Confirm" }],
      description: "Continue?",
      dismissible: false,
      title: "Confirm",
      useX: true
    })
    expect(useDialog().dialogState).toBe(dialogState)
    expect(dialogState).toEqual({
      actions: [{ callback, color: "primary", icon: "Check", name: "Confirm" }],
      description: "Continue?",
      dismissible: false,
      isOpen: true,
      title: "Confirm",
      useX: true
    })
    expect(callback).not.toHaveBeenCalled()
  })

  it("replaces previous options with defaults when shown again", () => {
    const { dialogState, show } = useDialog()
    show({
      actions: [{ name: "Confirm" }],
      description: "Details",
      dismissible: false,
      title: "Title",
      useX: true
    })
    show()
    expect(dialogState).toEqual({
      actions: [],
      description: "",
      dismissible: true,
      isOpen: true,
      title: "",
      useX: false
    })
  })

  it("hides and resets every field including useX", () => {
    const { dialogState, hide, show } = useDialog()
    show({
      actions: [{ name: "Confirm" }],
      description: "Details",
      dismissible: false,
      title: "Title",
      useX: true
    })
    hide()
    expect(dialogState).toEqual({
      actions: [],
      description: "",
      dismissible: true,
      isOpen: false,
      title: "",
      useX: false
    })
  })
})
