import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import Sidebar from "#src/components/dashboard/Sidebar.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"

const auth = vi.hoisted(() => ({ logout: vi.fn<() => Promise<void>>() }))
vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))
enableAutoUnmount(afterEach)
const layout = useDashboardLayout()
const resize = async (width: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width })
  window.dispatchEvent(new Event("resize"))
  await nextTick()
}
const setup = async (path = "/dashboard") => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Sidebar, { global: { plugins: [router], stubs: { Icon: true } } })
  return { router, wrapper }
}
beforeEach(async () => {
  layout.reset()
  layout.closeMobileMenu()
  auth.logout.mockReset().mockResolvedValue()
  await resize(700)
})

describe("Sidebar", () => {
  it("renders all items in order with exact dashboard and prefix active rules", async () => {
    const { router, wrapper } = await setup()
    expect(wrapper.findAll("button").map((button) => button.text())).toEqual([
      "Gallery",
      "Dashboard",
      "Images",
      "Collections",
      "Tasks",
      "Settings",
      "Logout"
    ])
    expect(wrapper.get("li.active").text()).toBe("Dashboard")
    for (const [path, label] of [
      ["/", "Gallery"],
      ["/dashboard/images/123/edit", "Images"],
      ["/dashboard/collections/123/images", "Collections"],
      ["/dashboard/tasks", "Tasks"],
      ["/dashboard/settings", "Settings"],
      ["/dashboard/images-extra", "Images"]
    ]) {
      await router.push(path)
      expect(wrapper.findAll("li.active").map((item) => item.text())).toEqual([label])
    }
    await router.push("/dashboard/other")
    expect(wrapper.find("li.active").exists()).toBe(false)
    expect(wrapper.get("button.logout").text()).toBe("Logout")
  })

  it("resets selection before navigation and closes the menu after route changes", async () => {
    const { router, wrapper } = await setup()
    layout.setSelection({ actions: [{ onClick: vi.fn(), text: "Delete" }], items: 2 })
    layout.toggleMobileMenu()
    await nextTick()
    expect(wrapper.get("aside").classes()).toContain("is-open")
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(true)
    await wrapper.get(".top li:nth-child(3) button").trigger("click")
    expect(layout.selection).toMatchObject({ actions: [], items: 0 })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
    expect(layout.mobileMenu.isOpen).toBe(false)
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(false)
    layout.toggleMobileMenu()
    await router.push("/login")
    expect(layout.mobileMenu.isOpen).toBe(false)
  })

  it("waits for logout before navigating and still resets selection immediately", async () => {
    let finish = () => {}
    auth.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const { router, wrapper } = await setup()
    layout.setSelection({ items: 1 })
    await wrapper.get("button.logout").trigger("click")
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(layout.selection.items).toBe(0)
    expect(router.currentRoute.value.path).toBe("/dashboard")
    finish()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/login")
  })

  it("closes on backdrop click and only when crossing out of the 992px mobile range", async () => {
    const { wrapper } = await setup()
    layout.toggleMobileMenu()
    await nextTick()
    await wrapper.get(".sidebar-backdrop").trigger("click")
    expect(layout.mobileMenu.isOpen).toBe(false)
    layout.toggleMobileMenu()
    await resize(991)
    expect(layout.mobileMenu.isOpen).toBe(true)
    await resize(992)
    expect(layout.mobileMenu.isOpen).toBe(false)
    layout.toggleMobileMenu()
    await resize(1100)
    expect(layout.mobileMenu.isOpen).toBe(true)
    await resize(700)
    expect(layout.mobileMenu.isOpen).toBe(true)
    await resize(992)
    expect(layout.mobileMenu.isOpen).toBe(false)
  })
})
