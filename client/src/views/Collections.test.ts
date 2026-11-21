import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import Collections from "#src/views/Collections.vue"

describe("Collections", () => {
  it("renders its placeholder", () => {
    const wrapper = mount(Collections)
    expect(wrapper.text()).toBe("Collections View")
    wrapper.unmount()
  })
})
