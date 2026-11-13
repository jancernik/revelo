import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick, reactive } from "vue"

import Pager from "./Pager.vue"
import { browser, renderer, source } from "./test/helpers"

const wrappers: ReturnType<typeof mount>[] = []
const setup = async (props: Partial<InstanceType<typeof Pager>["$props"]> = {}) => {
  const clock = browser()
  const drawing = renderer()
  const wrapper = mount(Pager, {
    attachTo: document.body,
    props: { config: { haptics: false }, renderer: () => drawing, slides: source(), ...props }
  })
  wrappers.push(wrapper)
  await nextTick()
  clock.flush()
  await nextTick()
  return { clock, drawing, wrapper }
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("Pager", () => {
  it("labels and announces the actual item without requiring v-model", async () => {
    const { clock, wrapper } = await setup({ autofocus: true, label: "Examples" })
    expect(document.activeElement).toBe(wrapper.element)
    expect(wrapper.attributes("aria-label")).toBe("Examples")
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Item 1 of 6")
    await wrapper.trigger("keydown", { key: "ArrowDown" })
    clock.flush()
    await nextTick()
    expect(wrapper.emitted("update:index")).toEqual([[0], [1]])
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Item 2 of 6")
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("Item 2 of 6")
  })

  it("announces prop-driven navigation only when it lands and never queues a refused goTo", async () => {
    const describe = vi.fn((index: number) => `Slide ${index}`)
    const { clock, wrapper } = await setup({ describe })
    await wrapper.setProps({ index: 3 })
    clock.frame()
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Slide 0")
    await wrapper.setProps({ index: 5 })
    clock.flush()
    await nextTick()
    expect(wrapper.vm.frame()?.from).toBe(3)
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Slide 3")
    expect(wrapper.emitted("update:index")).toEqual([[0], [3]])
  })

  it("updates an in-place count change and describes an empty source", async () => {
    const slides = reactive({ count: 4, get: () => ({ aspect: 1, image: null }) })
    const { clock, wrapper } = await setup({ index: 3, slides })
    slides.count = 1
    await nextTick()
    clock.flush()
    await nextTick()
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Item 1 of 1")
    slides.count = 0
    await nextTick()
    clock.flush()
    await nextTick()
    expect(wrapper.get('[aria-live="polite"]').text()).toBe("No items")
    expect(wrapper.vm.frame()?.from).toBe(-1)
  })

  it("scopes keys to the focused region and releases the renderer on unmount", async () => {
    const { clock, drawing, wrapper } = await setup()
    expect(document.activeElement).not.toBe(wrapper.element)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))
    clock.flush()
    expect(wrapper.vm.frame()?.from).toBe(0)
    wrapper.vm.step("y", 1)
    clock.frame()
    wrapper.unmount()
    wrappers.length = 0
    expect(drawing.dispose).toHaveBeenCalledTimes(1)
    expect(clock.frames.size).toBe(0)
  })
})
