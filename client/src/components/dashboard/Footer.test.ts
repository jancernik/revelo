import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import Button from "#src/components/common/Button.vue"
import Footer from "#src/components/dashboard/Footer.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"

enableAutoUnmount(afterEach)
const layout = useDashboardLayout()
const setup = () => mount(Footer, { global: { stubs: { Icon: true } } })
beforeEach(() => layout.reset())

describe("Footer", () => {
  it("is hidden without actions and follows action registration and reset", async () => {
    const wrapper = setup()
    expect(wrapper.find(".dashboard-footer").exists()).toBe(false)
    layout.setFooter({ actions: [{ onClick: vi.fn(), text: "Save" }] })
    await nextTick()
    expect(wrapper.get(".dashboard-footer").text()).toBe("Save")
    layout.resetFooter()
    await nextTick()
    expect(wrapper.find(".dashboard-footer").exists()).toBe(false)
  })

  it("renders action order, appearance and callbacks, and respects disabled buttons", async () => {
    const save = vi.fn()
    const cancel = vi.fn()
    layout.setFooter({
      actions: [
        { color: "secondary", icon: "Save", key: "save", onClick: save, text: "Save" },
        { disabled: true, key: "cancel", onClick: cancel, text: "Cancel" }
      ]
    })
    const wrapper = setup()
    const buttons = wrapper.findAllComponents(Button)
    expect(buttons.map((button) => button.text())).toEqual(["Save", "Cancel"])
    expect(buttons[0]?.props()).toMatchObject({ color: "secondary", icon: "Save" })
    await wrapper.get("button:not(:disabled)").trigger("click")
    await wrapper.get("button:disabled").trigger("click")
    expect(save).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })
})
