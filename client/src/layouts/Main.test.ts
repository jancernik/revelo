import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import Main from "#src/layouts/Main.vue"

enableAutoUnmount(afterEach)

describe("Main layout", () => {
  it("wraps the active route in the main scrollable content", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ component: { template: '<p class="page">Page</p>' }, path: "/" }]
    })
    await router.push("/")
    await router.isReady()
    const wrapper = mount(Main, { global: { plugins: [router] } })
    expect(wrapper.element.tagName).toBe("MAIN")
    expect(wrapper.attributes("id")).toBe("main")
    expect(wrapper.get(".main-inner.inner.scrollable > .page").text()).toBe("Page")
  })
})
