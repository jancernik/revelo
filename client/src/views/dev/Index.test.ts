import type { App } from "vue"

import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApp, nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import DevIndex from "#src/views/dev/Index.vue"
import Sidebar from "#src/views/dev/Sidebar.vue"

vi.mock("#src/views/dev/examples/Button.vue", () => ({
  default: { template: '<div data-example-stub="Button" />' }
}))
vi.mock("#src/views/dev/examples/Dialog.vue", () => ({
  default: { template: '<div data-example-stub="Dialog" />' }
}))
vi.mock("#src/views/dev/examples/Icon.vue", () => ({
  default: { template: '<div data-example-stub="Icon" />' }
}))
vi.mock("#src/views/dev/examples/Input.vue", () => ({
  default: { template: '<div data-example-stub="Input" />' }
}))
vi.mock("#src/views/dev/examples/Progress.vue", () => ({
  default: { template: '<div data-example-stub="Progress" />' }
}))
vi.mock("#src/views/dev/examples/Switch.vue", () => ({
  default: { template: '<div data-example-stub="Switch" />' }
}))
vi.mock("#src/views/dev/examples/Toast.vue", () => ({
  default: { template: '<div data-example-stub="Toast" />' }
}))
vi.mock("#src/views/dev/examples/Toggle.vue", () => ({
  default: { template: '<div data-example-stub="Toggle" />' }
}))

const names = ["Button", "Dialog", "Icon", "Input", "Progress", "Switch", "Toast", "Toggle"]
const ids = names.map((name) => name.toLowerCase())

const scrolledTo: string[] = []
const scrollIntoView = vi.fn(function (this: Element) {
  scrolledTo.push(this.id)
})
const observers: FakeIntersectionObserver[] = []
class FakeIntersectionObserver implements IntersectionObserver {
  callback: IntersectionObserverCallback
  disconnected = false
  options?: IntersectionObserverInit
  readonly root: Element | null = null
  readonly rootMargin = ""
  readonly scrollMargin = ""
  targets: Element[] = []
  readonly thresholds: readonly number[] = []
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    observers.push(this)
  }
  disconnect() {
    this.disconnected = true
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

enableAutoUnmount(afterEach)

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
})

beforeEach(async () => {
  observers.length = 0
  scrolledTo.length = 0
  scrollIntoView.mockClear()
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
    writable: true
  })
  await router.push("/dev")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, "scrollIntoView")
})

const setup = async (path = "/dev") => {
  await router.push(path)
  const wrapper = mount(DevIndex, {
    attachTo: document.body,
    global: { plugins: [router], stubs: { Icon: true } }
  })
  await flushPromises()
  return { router, wrapper }
}

const entry = (target: Element): IntersectionObserverEntry => ({
  boundingClientRect: target.getBoundingClientRect(),
  intersectionRatio: 1,
  intersectionRect: target.getBoundingClientRect(),
  isIntersecting: true,
  rootBounds: null,
  target,
  time: performance.now()
})

const fire = async (targetId: string) => {
  const observer = observers[0]
  if (!observer) throw new Error("No IntersectionObserver was created")
  const target = document.getElementById(targetId)
  if (!target) throw new Error(`Missing section ${targetId}`)
  observer.callback([entry(target)], observer)
  await flushPromises()
}

describe("dev Index", () => {
  it("loads examples in name order, renders their sections and observes them", async () => {
    const { wrapper } = await setup()
    const sidebar = wrapper.getComponent(Sidebar)
    expect(sidebar.props("components").map((item) => item.name)).toEqual(names)
    const sections = wrapper.findAll("section")
    expect(sections.map((item) => item.attributes("id"))).toEqual(ids)
    expect(sections.map((item) => item.find("h3").text())).toEqual(names)
    expect(
      sections.map((item) => item.find("[data-example-stub]").attributes("data-example-stub"))
    ).toEqual(names)
    expect(observers).toHaveLength(1)
    expect(observers[0]?.options).toEqual({ rootMargin: "-20% 0px -70% 0px", threshold: 0 })
    expect(observers[0]?.targets.map((item) => item.id)).toEqual(ids)
  })

  it("scrolls to the route hash section on mount", async () => {
    await setup("/dev#input")
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrolledTo).toEqual(["input"])
  })

  it("follows intersections into the active section and the route hash", async () => {
    const { wrapper } = await setup()
    const sidebar = wrapper.getComponent(Sidebar)
    await fire("switch")
    expect(sidebar.props("activeSection")).toBe("switch")
    expect(router.currentRoute.value.hash).toBe("#switch")
    await fire("icon")
    expect(sidebar.props("activeSection")).toBe("icon")
    expect(router.currentRoute.value.hash).toBe("#icon")
  })

  it("scrolls on navigate, ignores intersections until scrolling settles and then resumes", async () => {
    vi.useFakeTimers()
    try {
      const { wrapper } = await setup()
      const container = wrapper.get(".components").element
      const removeSpy = vi.spyOn(container, "removeEventListener")
      const sidebar = wrapper.getComponent(Sidebar)
      await sidebar.findAll("button")[7]?.trigger("click")
      await flushPromises()
      expect(sidebar.props("activeSection")).toBe("toggle")
      expect(router.currentRoute.value.hash).toBe("#toggle")
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrolledTo).toEqual(["toggle"])
      await fire("button")
      expect(sidebar.props("activeSection")).toBe("toggle")
      vi.advanceTimersByTime(150)
      expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function))
      await fire("button")
      expect(sidebar.props("activeSection")).toBe("button")
      expect(router.currentRoute.value.hash).toBe("#button")
    } finally {
      vi.useRealTimers()
    }
  })

  it("marks the last section active when the container scrolls near its bottom", async () => {
    const { wrapper } = await setup()
    const container = wrapper.get(".components").element
    Object.defineProperty(container, "scrollTop", { configurable: true, value: 950 })
    Object.defineProperty(container, "scrollHeight", { configurable: true, value: 1000 })
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 100 })
    await container.dispatchEvent(new Event("scroll"))
    await flushPromises()
    expect(wrapper.getComponent(Sidebar).props("activeSection")).toBe("toggle")
    expect(router.currentRoute.value.hash).toBe("#toggle")
  })

  it("disconnects the observer when the view unmounts", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const app: App = createApp(DevIndex)
    app.use(router)
    app.mount(container)
    await flushPromises()
    app.unmount()
    await nextTick()
    expect(observers[0]?.disconnected).toBe(true)
    expect(container.querySelector(".components")).toBeNull()
    container.remove()
  })
})
