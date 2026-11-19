import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import Toast from "#src/components/common/Toast.vue"
import { useToast } from "#src/composables/useToast"

enableAutoUnmount(afterEach)
const toast = useToast()
const setup = () => mount(Toast, { global: { stubs: { Icon: true } } })
beforeEach(() => toast.clear())
afterEach(() => toast.clear())

describe("Toast", () => {
  it("renders reactive toast state through the named transition group", async () => {
    const wrapper = setup()
    expect(wrapper.findAll(".toast-wrapper")).toHaveLength(0)
    expect(wrapper.get("transition-group-stub").attributes("name")).toBe("toast")
    toast.show({ description: "Details", duration: 0, title: "Notice" })
    await nextTick()
    expect(wrapper.get(".title").text()).toBe("Notice")
    expect(wrapper.get(".description").text()).toBe("Details")
    expect(wrapper.get(".toast").classes()).toContain("toast-info")
    expect(wrapper.get(".toast-wrapper").classes()).not.toContain("toast-visible")
    toast.clear()
    await nextTick()
    expect(wrapper.find(".toast").exists()).toBe(false)
  })

  it.each([
    ["error", "AlertCircle"],
    ["info", "Info"],
    ["success", "CheckCircle"],
    ["warning", "AlertTriangle"]
  ] as const)("renders the %s type icon %s", (type, name) => {
    toast.show({ dismissible: false, duration: 0, type })
    const wrapper = setup()
    expect(wrapper.getComponent(Icon).props()).toMatchObject({ name, size: 20 })
    expect(wrapper.get(".toast").classes()).toContain(`toast-${type}`)
    expect(wrapper.find(".close").exists()).toBe(false)
    expect(wrapper.find(".title").exists()).toBe(false)
    expect(wrapper.find(".description").exists()).toBe(false)
  })

  it("hides optional icons and removes only the clicked toast", async () => {
    toast.show({ duration: 0, showIcon: false, title: "First" })
    toast.show({ duration: 0, title: "Second" })
    const wrapper = setup()
    expect(wrapper.findAll(".toast")[0]?.find(".content icon-stub").exists()).toBe(false)
    await wrapper.get(".close").trigger("click")
    expect(toast.toastState.toasts.map((item) => item.title)).toEqual(["Second"])
    expect(wrapper.findAll(".toast")).toHaveLength(1)
  })

  it("calls action before removing, passes action props and supports no callback", async () => {
    const callback = vi.fn(() => expect(toast.toastState.toasts).toHaveLength(1))
    toast.show({ action: { callback, icon: "Plus", name: "Undo" }, duration: 0 })
    const wrapper = setup()
    expect(wrapper.getComponent(Button).props()).toMatchObject({ color: "secondary", icon: "Plus" })
    expect(wrapper.getComponent(Button).text()).toBe("Undo")
    await wrapper.getComponent(Button).trigger("click")
    expect(callback).toHaveBeenCalledOnce()
    expect(toast.toastState.toasts).toEqual([])
    toast.show({ action: { color: "primary", name: "Done" }, duration: 0 })
    await nextTick()
    expect(wrapper.getComponent(Button).props("color")).toBe("primary")
    await wrapper.getComponent(Button).trigger("click")
    expect(toast.toastState.toasts).toEqual([])
  })
})
