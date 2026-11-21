import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import Collections from "#src/layouts/Collections.vue"

enableAutoUnmount(afterEach)

describe("Collections layout", () => {
  it("renders its nested route through RouterView", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          children: [
            { component: { template: '<p class="collection-page">Collection</p>' }, path: ":id" }
          ],
          component: Collections,
          path: "/collections"
        }
      ]
    })
    await router.push("/collections/album")
    await router.isReady()
    const wrapper = mount({ template: "<RouterView />" }, { global: { plugins: [router] } })
    expect(wrapper.findComponent(Collections).exists()).toBe(true)
    expect(wrapper.get(".collection-page").text()).toBe("Collection")
  })
})
