import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useToast } from "#src/composables/useToast"
import ToastExample from "#src/views/dev/examples/Toast.vue"

enableAutoUnmount(afterEach)
afterEach(() => useToast().clear())

describe("Toast example", () => {
  it("mounts every group with its buttons and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(ToastExample, { global: { stubs: { Icon: true } } })
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Toast Types",
      "Content Variations",
      "With Actions",
      "Persistence Options",
      "Multiple & Management"
    ])
    expect(wrapper.findAll("button").map((item) => item.text().trim())).toEqual([
      "Success",
      "Error",
      "Warning",
      "Info",
      "Title Only",
      "Description Only",
      "Long Content",
      "View Message",
      "Delete Item",
      "Persistent",
      "Non-dismissible",
      "Show Multiple",
      "Clear All"
    ])
    expect(error).not.toHaveBeenCalled()
  })

  it("pushes toasts through the shared composable and clears them", async () => {
    const { toastState } = useToast()
    const wrapper = mount(ToastExample, { global: { stubs: { Icon: true } } })
    const buttons = wrapper.findAll("button")
    await buttons[0]?.trigger("click")
    expect(toastState.toasts.map((toast) => toast.title)).toEqual(["Success!"])
    await buttons[1]?.trigger("click")
    expect(toastState.toasts.map((toast) => toast.type)).toEqual(["success", "error"])
    await buttons[11]?.trigger("click")
    expect(toastState.toasts.map((toast) => toast.title)).toEqual([
      "Success!",
      "Error occurred",
      "First toast"
    ])
    await buttons[12]?.trigger("click")
    expect(toastState.toasts.map((toast) => toast.title)).toEqual(["All toasts cleared"])
    expect(toastState.toasts[0]?.dismissible).toBe(false)
  })

  it("keeps persistent toasts without timers and attaches action payloads", async () => {
    vi.useFakeTimers()
    try {
      const { toastState } = useToast()
      const wrapper = mount(ToastExample, { global: { stubs: { Icon: true } } })
      const buttons = wrapper.findAll("button")
      await buttons[9]?.trigger("click")
      const persistent = toastState.toasts[0]
      expect(persistent?.duration).toBe(0)
      vi.advanceTimersByTime(60_000)
      expect(toastState.toasts).toHaveLength(1)
      await buttons[7]?.trigger("click")
      expect(toastState.toasts.at(-1)?.action).toMatchObject({ name: "View" })
    } finally {
      vi.useRealTimers()
    }
  })
})
