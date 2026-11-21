import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

const lucide = vi.hoisted(
  () =>
    new Proxy(
      {},
      {
        get: (_target, name) => {
          if (name === "__esModule") return true
          return { name: String(name), render: () => null }
        },
        has: () => true
      }
    )
)
vi.mock("@lucide/vue", () => lucide)

import IconExample from "#src/views/dev/examples/Icon.vue"

enableAutoUnmount(afterEach)

describe("Icon example", () => {
  it("mounts every group with real icons and without console errors", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = mount(IconExample)
    expect(wrapper.findAll("h5").map((item) => item.text())).toEqual([
      "Basic Icons",
      "Different Sizes",
      "Custom Colors",
      "Different Stroke Widths"
    ])
    expect(wrapper.findAll(".icon")).toHaveLength(18)
    expect(error).not.toHaveBeenCalled()
  })
})
