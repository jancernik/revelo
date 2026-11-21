import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Loading from "#src/components/Loading.vue"

const render = (progress?: number, onComplete = vi.fn()) =>
  mount(Loading, { props: { onComplete, progress } })

enableAutoUnmount(afterEach)
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("Loading", () => {
  it("defaults to an indeterminate visible indicator", () => {
    const wrapper = render()
    expect(wrapper.classes()).not.toContain("hidden")
    expect(wrapper.get(".progress").classes()).toContain("indeterminate")
  })

  it("displays numeric progress and hides after the 300ms completion delay", async () => {
    const onComplete = vi.fn()
    const wrapper = render(25, onComplete)
    expect(wrapper.get(".progress").classes()).not.toContain("indeterminate")
    expect(wrapper.get(".progress").attributes("style")).toContain("--progress-value: 0.25")
    await wrapper.setProps({ progress: 100 })
    expect(wrapper.classes()).toContain("hidden")
    await vi.advanceTimersByTimeAsync(299)
    expect(wrapper.element.style.display).not.toBe("none")
    expect(onComplete).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.element.style.display).toBe("none")
    expect(onComplete).toHaveBeenCalledOnce()
    await wrapper.setProps({ progress: 0 })
    expect(wrapper.element.style.display).toBe("flex")
    expect(wrapper.classes()).not.toContain("hidden")
  })

  it("handles an initially complete indicator without a callback", async () => {
    const wrapper = mount(Loading, { props: { progress: 100 } })
    expect(wrapper.classes()).toContain("hidden")
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.element.style.display).toBe("none")
  })

  it("still runs a pending hide after progress restarts (quirk)", async () => {
    const onComplete = vi.fn()
    const wrapper = render(0, onComplete)
    await wrapper.setProps({ progress: 100 })
    await vi.advanceTimersByTimeAsync(100)
    await wrapper.setProps({ progress: 20 })
    expect(wrapper.element.style.display).toBe("flex")
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.classes()).not.toContain("hidden")
    expect(wrapper.element.style.display).toBe("none")
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it("still calls onComplete after unmount (quirk)", async () => {
    const onComplete = vi.fn()
    const wrapper = render(100, onComplete)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(300)
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
