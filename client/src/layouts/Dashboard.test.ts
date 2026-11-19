import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import Footer from "#src/components/dashboard/Footer.vue"
import Header from "#src/components/dashboard/Header.vue"
import Sidebar from "#src/components/dashboard/Sidebar.vue"
import Dashboard from "#src/layouts/Dashboard.vue"

enableAutoUnmount(afterEach)

describe("Dashboard layout", () => {
  it("composes the sidebar, header, nested route and footer in order", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          children: [{ component: { template: '<p class="page">Dashboard page</p>' }, path: "" }],
          component: Dashboard,
          path: "/dashboard"
        }
      ]
    })
    await router.push("/dashboard")
    await router.isReady()
    const wrapper = mount(
      { template: "<RouterView />" },
      {
        global: { plugins: [router], stubs: { Footer: true, Header: true, Sidebar: true } }
      }
    )
    expect(wrapper.findComponent(Dashboard).exists()).toBe(true)
    expect(wrapper.findComponent(Sidebar).exists()).toBe(true)
    expect(wrapper.findComponent(Header).exists()).toBe(true)
    expect(wrapper.findComponent(Footer).exists()).toBe(true)
    expect(wrapper.find(".dashboard-layout > sidebar-stub + .dashboard-main").exists()).toBe(true)
    expect(
      wrapper.find(".dashboard-main > header-stub + .dashboard-content + footer-stub").exists()
    ).toBe(true)
    expect(wrapper.get(".dashboard-content > .page").text()).toBe("Dashboard page")
  })
})
