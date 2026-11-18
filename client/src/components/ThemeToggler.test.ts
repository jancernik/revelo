import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import ThemeToggler from "#src/components/ThemeToggler.vue"
import { deferred } from "#src/stores/test/helpers"

const setTheme = vi.hoisted(() => vi.fn())
const isWaitingForGallery = ref(false)
const themeClass = ref("light")
vi.mock("#src/composables/useTheme", () => ({
  useTheme: () => ({ isWaitingForGallery, setTheme, themeClass })
}))

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  isWaitingForGallery.value = false
  themeClass.value = "light"
})
afterEach(() => vi.restoreAllMocks())

const render = () => {
  const wrapper = mount(ThemeToggler, { global: { stubs: { Icon: true } } })
  const button = wrapper.get("button")
  vi.spyOn(button.element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 80, 40))
  return { button, wrapper }
}

const pointer = async (
  button: { element: Element },
  type: "pointerdown" | "pointerup",
  pointerType = "touch",
  clientX = 50
) => {
  button.element.dispatchEvent(
    new PointerEvent(type, { clientX, clientY: 40, pointerId: 1, pointerType })
  )
  await nextTick()
}

describe("ThemeToggler", () => {
  it.each(["light", "dark"])(
    "switches from %s at the button centre and blurs after completion",
    async (theme) => {
      themeClass.value = theme
      const completion = deferred<void>()
      setTheme.mockReturnValue(completion.promise)
      const { button, wrapper } = render()
      const blur = vi.spyOn(button.element, "blur")
      expect(wrapper.find("[name='Zap']").classes()).toContain("dark-icon")
      expect(wrapper.find("[name='ZapOff']").classes()).toContain("light-icon")
      expect(wrapper.find("[name='Loader2']").exists()).toBe(false)
      await button.trigger("click")
      expect(setTheme).toHaveBeenCalledExactlyOnceWith(theme === "dark" ? "light" : "dark", {
        origin: { x: 50, y: 40 }
      })
      expect(blur).not.toHaveBeenCalled()
      completion.resolve()
      await completion.promise
      expect(blur).toHaveBeenCalledOnce()
    }
  )

  it("shows a loader and refuses click or tap while the gallery settles", async () => {
    isWaitingForGallery.value = true
    const { button, wrapper } = render()
    expect(button.classes()).toContain("loading")
    expect(wrapper.get("[name='Loader2']").classes()).toContain("loading-icon")
    await button.trigger("click")
    await pointer(button, "pointerdown")
    await pointer(button, "pointerup")
    await button.trigger("click")
    expect(setTheme).not.toHaveBeenCalled()
    isWaitingForGallery.value = false
    await button.trigger("click")
    expect(button.classes()).not.toContain("loading")
    expect(setTheme).toHaveBeenCalledOnce()
  })

  it("activates on touch release and suppresses only its following click", async () => {
    const { button } = render()
    await pointer(button, "pointerdown")
    await pointer(button, "pointerup")
    expect(setTheme).toHaveBeenCalledOnce()
    await button.trigger("click")
    expect(setTheme).toHaveBeenCalledOnce()
    await button.trigger("click")
    expect(setTheme).toHaveBeenCalledTimes(2)
  })

  it("does not activate a drag and leaves mouse activation to click", async () => {
    const { button } = render()
    await pointer(button, "pointerdown")
    await pointer(button, "pointerup", "touch", 80)
    expect(setTheme).not.toHaveBeenCalled()
    await pointer(button, "pointerdown", "mouse")
    await pointer(button, "pointerup", "mouse")
    expect(setTheme).not.toHaveBeenCalled()
    await button.trigger("click")
    expect(setTheme).toHaveBeenCalledOnce()
  })
})
