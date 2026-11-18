import type { ComponentOptions } from "vue"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { GalleryHandle } from "#src/components/images/types"

import { flushGallery, registerGallery } from "#src/test/galleryFixtures"
import Home from "#src/views/Home.vue"

const isTouchPrimary = ref(false)
const settings = ref({ nativeScroll: true })
vi.mock("#src/composables/useDevice", () => ({ useDevice: () => ({ isTouchPrimary }) }))
vi.mock("#src/composables/useSettings", () => ({ useSettings: () => ({ settings }) }))
vi.mock("#src/composables/useTheme", () => ({
  useTheme: () => ({ registerImageGallery: registerGallery })
}))
const stub = (name: string) => {
  const handle: GalleryHandle & { isAnimating: () => boolean } = {
    isAnimating: () => false,
    isScrollPaused: () => false,
    onSettle: (callback) => callback(),
    pauseScrolling: vi.fn(),
    resumeScrolling: vi.fn(),
    startAutoScroll: vi.fn(),
    stopAutoScroll: vi.fn()
  }
  const options: ComponentOptions = {}
  options.props = ["alternatingScroll", "columns", "continuousScroll", "menuVisible", "scrollSpeed"]
  options.setup = (_, { expose }) => {
    expose(handle)
    return () => h("div", { class: name })
  }
  return { component: defineComponent(options), handle }
}
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.clearAllMocks()
  isTouchPrimary.value = false
  settings.value.nativeScroll = true
})
const render = async (query = "") => {
  const custom = stub("custom-gallery")
  const native = stub("native-gallery")
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/" }]
  })
  await router.push("/" + query)
  await router.isReady()
  const wrapper = mount(Home, {
    global: {
      plugins: [router],
      stubs: { ImageGallery: custom.component, NativeImageGallery: native.component }
    }
  })
  await flushGallery()
  return { custom, native, router, wrapper }
}

describe("Home", () => {
  it.each([
    [false, true, "", false],
    [true, true, "", true],
    [true, false, "", false],
    [false, false, "?native=true", true],
    [true, true, "?native=false", false],
    [true, true, "?native=true&alternating=true", false],
    [true, true, "?native=true&continuous=true", false]
  ])(
    "selects the gallery for touch %s, native setting %s, query %s",
    async (touch, nativeSetting, query, native) => {
      isTouchPrimary.value = touch
      settings.value.nativeScroll = nativeSetting
      const setup = await render(query)
      expect(setup.wrapper.find(".native-gallery").exists()).toBe(native)
      expect(setup.wrapper.find(".custom-gallery").exists()).toBe(!native)
    }
  )

  it("passes parsed query options unchanged to the custom gallery", async () => {
    const setup = await render("?columns=3&alternating=true&continuous=true&menu=false&speed=42")
    expect(setup.wrapper.getComponent(setup.custom.component).props()).toEqual({
      alternatingScroll: true,
      columns: 3,
      continuousScroll: true,
      menuVisible: false,
      scrollSpeed: 42
    })
  })

  it("uses default custom options and preserves numeric NaN values", async () => {
    const setup = await render()
    expect(setup.wrapper.getComponent(setup.custom.component).props()).toEqual({
      alternatingScroll: false,
      columns: null,
      continuousScroll: false,
      menuVisible: true,
      scrollSpeed: 20
    })
    await setup.router.push("/?columns=nope&speed=nope")
    await flushGallery()
    expect(setup.wrapper.getComponent(setup.custom.component).props("columns")).toBeNaN()
    expect(setup.wrapper.getComponent(setup.custom.component).props("scrollSpeed")).toBeNaN()
  })

  it("registers the exposed instance initially and after gallery selection changes", async () => {
    const setup = await render()
    expect(registerGallery.mock.calls[0]).toEqual([undefined])
    const current: unknown = registerGallery.mock.calls.at(-1)?.[0]
    expect(current).toMatchObject(setup.custom.handle)
    isTouchPrimary.value = true
    await flushGallery()
    expect(registerGallery.mock.calls.at(-1)?.[0]).toMatchObject(setup.native.handle)
  })

  it("does not unregister the instance on unmount because its watcher is already stopped (quirk)", async () => {
    const setup = await render()
    const calls = registerGallery.mock.calls.length
    setup.wrapper.unmount()
    await flushGallery()
    expect(registerGallery).toHaveBeenCalledTimes(calls)
    expect(registerGallery.mock.calls.at(-1)?.[0]).not.toBeNull()
  })
})
