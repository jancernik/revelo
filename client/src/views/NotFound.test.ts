import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import NotFound from "#src/views/NotFound.vue"

enableAutoUnmount(afterEach)

const setup = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push("/previous")
  await router.push("/missing")
  await router.isReady()
  const wrapper = mount(NotFound, { global: { plugins: [router], stubs: { Icon: true } } })
  return { router, wrapper }
}

describe("NotFound", () => {
  it("renders the 404 message with the two navigation buttons", async () => {
    const { wrapper } = await setup()
    expect(wrapper.get(".error-code").text()).toBe("404")
    expect(wrapper.get("h1").text()).toBe("Page Not Found")
    expect(wrapper.findAll("button").map((button) => button.text())).toEqual(["Go Home", "Go Back"])
  })

  it("navigates home on Go Home", async () => {
    const { router, wrapper } = await setup()
    await wrapper.get("button.color-primary").trigger("click")
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })

  it("returns to the previous entry on Go Back", async () => {
    const { router, wrapper } = await setup()
    await wrapper.get("button.color-secondary").trigger("click")
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/previous")
  })
})
