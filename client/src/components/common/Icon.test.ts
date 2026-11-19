import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import Icon from "#src/components/common/Icon.vue"

const lucide = vi.hoisted(() => ({ fail: false, loads: 0 }))
vi.mock("@lucide/vue", async () => {
  const { defineComponent, h } = await import("vue")
  lucide.loads++
  const named = (name: string) =>
    defineComponent({
      inheritAttrs: false,
      props: {
        color: { default: "currentColor", type: String },
        defaultClass: { default: "icon", type: String },
        size: { default: 24, type: [Number, String] },
        strokeWidth: { default: 2, type: Number }
      },
      setup: (props) => () =>
        h("svg", {
          class: props.defaultClass,
          "data-color": props.color,
          "data-name": name,
          "data-size": props.size,
          "data-stroke": props.strokeWidth
        })
    })
  return {
    Info: named("Info"),
    Plus: named("Plus"),
    get X() {
      if (lucide.fail) throw new Error("lucide unavailable")
      return named("X")
    }
  }
})

enableAutoUnmount(afterEach)
afterEach(() => {
  lucide.fail = false
  vi.restoreAllMocks()
})

describe("Icon", () => {
  it("lazy loads the named export and supplies default lucide props", async () => {
    const wrapper = mount(Icon, { props: { name: "Info" } })
    expect(wrapper.find("svg").exists()).toBe(false)
    await flushPromises()
    expect(lucide.loads).toBe(1)
    expect(wrapper.classes()).toContain("icon")
    expect(wrapper.attributes("style")).toContain("width: 24px")
    expect(wrapper.get("svg").attributes()).toMatchObject({
      "data-color": "currentColor",
      "data-name": "Info",
      "data-size": "24",
      "data-stroke": "2"
    })
  })

  it.each([32, "16"])("supports size %s and custom presentation", async (size) => {
    const wrapper = mount(Icon, {
      attrs: { "aria-label": "More" },
      props: { color: "red", defaultClass: "custom-icon", name: "Plus", size, strokeWidth: 3 }
    })
    await flushPromises()
    expect(wrapper.classes()).toContain("custom-icon")
    expect(wrapper.attributes("aria-label")).toBe("More")
    expect(wrapper.attributes("style")).toContain(`width: ${size}px`)
    expect(wrapper.attributes("style")).toContain(`height: ${size}px`)
    expect(wrapper.get("svg").attributes()).toMatchObject({
      "data-color": "red",
      "data-name": "Plus",
      "data-size": String(size),
      "data-stroke": "3"
    })
  })

  it("reloads when the name changes", async () => {
    const wrapper = mount(Icon, { props: { name: "Info" } })
    await flushPromises()
    await wrapper.setProps({ name: "Plus" })
    await flushPromises()
    expect(wrapper.get("svg").attributes("data-name")).toBe("Plus")
    expect(wrapper.findAll("svg")).toHaveLength(1)
  })

  it("reports async loading failure through Vue and renders no icon", async () => {
    lucide.fail = true
    const errorHandler = vi.fn()
    const wrapper = mount(Icon, {
      global: { config: { errorHandler } },
      props: { name: "X" }
    })
    await flushPromises()
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ message: "lucide unavailable" }),
      expect.anything(),
      "async component loader"
    )
    expect(wrapper.find("svg").exists()).toBe(false)
    expect(wrapper.element.tagName).toBe("SPAN")
  })

  it("can unmount before asynchronous loading resolves", async () => {
    const errorHandler = vi.fn()
    const wrapper = mount(Icon, { global: { config: { errorHandler } }, props: { name: "Info" } })
    wrapper.unmount()
    await flushPromises()
    expect(errorHandler).not.toHaveBeenCalled()
  })
})
