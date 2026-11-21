import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import Button from "#src/components/common/Button.vue"
import Header from "#src/components/dashboard/Header.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"

vi.mock("#src/composables/useDevice", () => ({ useDevice: () => ({ isMobile }) }))
const isMobile = ref(false)
enableAutoUnmount(afterEach)
const layout = useDashboardLayout()
const setup = () => mount(Header, { global: { stubs: { Icon: true } } })
beforeEach(() => {
  layout.reset()
  layout.closeMobileMenu()
  isMobile.value = false
})

describe("Header", () => {
  it("renders optional titles and subtitles and header actions in order", async () => {
    const first = vi.fn()
    const disabled = vi.fn()
    const wrapper = setup()
    expect(wrapper.find("h5").exists()).toBe(false)
    expect(wrapper.find(".text p").exists()).toBe(false)
    layout.setHeader({
      actions: [
        { color: "secondary", icon: "Plus", onClick: first, text: "Add" },
        { disabled: true, key: "disabled", onClick: disabled, text: "Disabled" }
      ],
      subtitle: "Manage your library",
      title: "Images"
    })
    await nextTick()
    expect(wrapper.get("h5").text()).toBe("Images")
    expect(wrapper.get(".text p").text()).toBe("Manage your library")
    expect(wrapper.findAllComponents(Button).map((button) => button.text())).toEqual([
      "Add",
      "Disabled"
    ])
    expect(wrapper.getComponent(Button).props()).toMatchObject({ color: "secondary", icon: "Plus" })
    await wrapper.get(".actions button:not(:disabled)").trigger("click")
    await wrapper.get(".actions button:disabled").trigger("click")
    expect(first).toHaveBeenCalledTimes(1)
    expect(disabled).not.toHaveBeenCalled()
  })

  it("switches to singular and plural selection counts and selection actions", async () => {
    const select = vi.fn()
    layout.setHeader({ actions: [{ onClick: vi.fn(), text: "Add" }], title: "Images" })
    const wrapper = setup()
    layout.setSelection({
      actions: [{ icon: "Trash", key: "delete", onClick: select, text: "Delete" }],
      items: 1
    })
    await nextTick()
    expect(wrapper.find("h5").exists()).toBe(false)
    expect(wrapper.get(".text").text()).toBe("1 item selected")
    expect(wrapper.getComponent(Button).text()).toBe("Delete")
    await wrapper.get(".actions button").trigger("click")
    expect(select).toHaveBeenCalledTimes(1)
    layout.setSelection({ items: 3 })
    await nextTick()
    expect(wrapper.get(".text").text()).toBe("3 items selected")
    layout.resetSelection()
    await nextTick()
    expect(wrapper.get("h5").text()).toBe("Images")
    expect(wrapper.getComponent(Button).text()).toBe("Add")
  })

  it("uses icon-only actions on mobile in both modes and toggles the menu", async () => {
    const action = { icon: "Plus", onClick: vi.fn(), text: "Add" } as const
    layout.setHeader({ actions: [action] })
    layout.setSelection({ actions: [action] })
    const wrapper = setup()
    expect(wrapper.getComponent(Button).props("iconOnly")).toBe(false)
    isMobile.value = true
    await nextTick()
    expect(wrapper.getComponent(Button).props("iconOnly")).toBe(true)
    expect(wrapper.getComponent(Button).find(".content").exists()).toBe(false)
    await wrapper.get(".mobile-menu-btn").trigger("click")
    expect(layout.mobileMenu.isOpen).toBe(true)
    layout.setSelection({ items: 1 })
    await nextTick()
    expect(wrapper.getComponent(Button).props("iconOnly")).toBe(true)
    await wrapper.get(".mobile-menu-btn").trigger("click")
    expect(layout.mobileMenu.isOpen).toBe(false)
    isMobile.value = false
    await nextTick()
    expect(wrapper.getComponent(Button).text()).toBe("Add")
  })
})
