import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import Images from "#src/layouts/Images.vue"

enableAutoUnmount(afterEach)

describe("Images layout", () => {
  it("renders its nested route through RouterView", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          children: [{ component: { template: '<p class="image-page">Image</p>' }, path: ":id" }],
          component: Images,
          path: "/images"
        }
      ]
    })
    await router.push("/images/photo")
    await router.isReady()
    const wrapper = mount({ template: "<RouterView />" }, { global: { plugins: [router] } })
    expect(wrapper.findComponent(Images).exists()).toBe(true)
    expect(wrapper.get(".image-page").text()).toBe("Image")
  })
})
