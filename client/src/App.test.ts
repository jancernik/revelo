import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import App from "#src/App.vue"
import Dialog from "#src/components/common/Dialog.vue"
import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import Toast from "#src/components/common/Toast.vue"
import Menu from "#src/components/Menu.vue"
import Main from "#src/layouts/Main.vue"

vi.mock("#src/composables/useTheme", () => ({ useTheme: () => ({ isAnimating, themeClass }) }))
const themeClass = ref("light")
const isAnimating = ref(false)
enableAutoUnmount(afterEach)
const setup = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: '<p class="page">Current route</p>' }, path: "/" }]
  })
  await router.push("/")
  await router.isReady()
  return mount(App, {
    global: {
      plugins: [router],
      stubs: { Dialog: true, FullscreenImage: true, Menu: true, Toast: true }
    }
  })
}
beforeEach(() => {
  themeClass.value = "light"
  isAnimating.value = false
  document.documentElement.className = "unrelated dark"
})
afterEach(() => {
  document.documentElement.className = ""
})

describe("App", () => {
  it("applies the current theme on mount and replaces only theme classes on change", async () => {
    await setup()
    expect(document.documentElement.className).toBe("unrelated light")
    themeClass.value = "dark"
    await nextTick()
    expect(document.documentElement.className).toBe("unrelated dark")
    themeClass.value = "light"
    await nextTick()
    expect(document.documentElement.className).toBe("unrelated light")
  })

  it("applies a dark theme already selected before mount", async () => {
    themeClass.value = "dark"
    document.documentElement.className = "unrelated light"
    await setup()
    expect(document.documentElement.className).toBe("unrelated dark")
  })

  it("leaves the document theme to the running theme transition", async () => {
    await setup()
    isAnimating.value = true
    themeClass.value = "dark"
    await nextTick()
    expect(document.documentElement.className).toBe("unrelated light")
    isAnimating.value = false
    themeClass.value = "light"
    await nextTick()
    themeClass.value = "dark"
    await nextTick()
    expect(document.documentElement.className).toBe("unrelated dark")
  })

  it("leaves the classes untouched when a transition is running at mount", async () => {
    isAnimating.value = true
    themeClass.value = "dark"
    await setup()
    expect(document.documentElement.className).toBe("unrelated dark")
  })

  it("composes Main with its routed page and the global overlays", async () => {
    const wrapper = await setup()
    expect(wrapper.findComponent(Main).exists()).toBe(true)
    expect(wrapper.get(".app-content main .page").text()).toBe("Current route")
    for (const overlay of [Menu, Toast, Dialog, FullscreenImage]) {
      expect(wrapper.findComponent(overlay).exists()).toBe(true)
    }
    expect(wrapper.get(".app-container").element.children[0]?.className).toBe("app-content")
  })
})
