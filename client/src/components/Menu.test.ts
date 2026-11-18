import type { gsap } from "gsap"
import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import { activatePinia } from "#src/stores/test/helpers"

const animation = vi.hoisted(() => ({
  fromTo: vi.fn<(target: unknown, from: gsap.TweenVars, to: gsap.TweenVars) => void>(),
  set: vi.fn<(target: unknown, vars: gsap.TweenVars) => void>(),
  timeline:
    vi.fn<(options: NonNullable<Parameters<typeof gsap.timeline>[0]>) => { to: () => void }>(),
  to: vi.fn<(target: unknown, vars: gsap.TweenVars) => void>()
}))
const setTheme = vi.hoisted(() => vi.fn())
const themeClass = ref("light")
const isWaitingForGallery = ref(false)
const settings = ref({
  aboutDialogDescription: "About the gallery",
  aboutDialogTitle: "Hello",
  showAboutDialog: true,
  showLoginLink: true
})
vi.mock("gsap", () => ({ default: animation, gsap: animation }))
vi.mock("#src/composables/useSettings", () => ({ useSettings: () => ({ settings }) }))
vi.mock("#src/composables/useTheme", () => ({
  useTheme: () => ({ isWaitingForGallery, setTheme, themeClass })
}))

let pinia: Pinia
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.useFakeTimers()
  pinia = activatePinia()
  settings.value = {
    aboutDialogDescription: "About the gallery",
    aboutDialogTitle: "Hello",
    showAboutDialog: true,
    showLoginLink: true
  }
  themeClass.value = "light"
  isWaitingForGallery.value = false
  animation.timeline.mockReturnValue({ to: vi.fn() })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(100, 20, 158, 52)
  )
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.restoreAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

const render = async ({
  path = "/",
  user = null,
  visible = true
}: { path?: string; user?: unknown; visible?: boolean } = {}) => {
  const [
    { default: Menu },
    { default: ImageSearcher },
    { useMenu },
    { useAuthStore },
    { useImagesStore },
    { useDialog }
  ] = await Promise.all([
    import("#src/components/Menu.vue"),
    import("#src/components/ImageSearcher.vue"),
    import("#src/composables/useMenu"),
    import("#src/stores/auth"),
    import("#src/stores/images"),
    import("#src/composables/useDialog")
  ])
  const auth = useAuthStore()
  auth.user = user
  const store = useImagesStore()
  const menu = useMenu()
  if (visible) menu.show(false)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ["/", "/login", "/dashboard", "/dashboard/images", "/images/example"].map((path) => ({
      component: { template: "<p>Page</p>" },
      path
    }))
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Menu, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { Icon: { template: '<span class="icon" />' } } }
  })
  await vi.advanceTimersByTimeAsync(0)
  return { auth, dialog: useDialog(), ImageSearcher, menu, router, store, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const ids = ({ wrapper }: Setup) =>
  wrapper.findAll("[data-item-id]").map((item) => item.attributes("data-item-id"))
const revealSort = async ({ wrapper }: Setup) => {
  const instance = wrapper.vm.$
  if (!("setupState" in instance)) throw new Error("Missing component state")
  const state = instance.setupState
  if (!state || typeof state !== "object" || !("menuConfig" in state))
    throw new Error("Missing menu state")
  const config = state.menuConfig
  if (
    !config ||
    typeof config !== "object" ||
    !("center" in config) ||
    !Array.isArray(config.center)
  )
    throw new Error("Missing menu configuration")
  const item: unknown = config.center.find(
    (value: unknown) =>
      value !== null && typeof value === "object" && "id" in value && value.id === "sort-toggler"
  )
  if (!item || typeof item !== "object" || !("visible" in item))
    throw new Error("Missing sort item")
  item.visible = true
  await nextTick()
}
const completeVisibility = async (show: boolean) => {
  const options = show
    ? animation.fromTo.mock.calls.at(-1)?.[2]
    : animation.to.mock.calls.at(-1)?.[1]
  if (
    !options ||
    typeof options !== "object" ||
    !("onComplete" in options) ||
    typeof options.onComplete !== "function"
  )
    throw new Error("Missing visibility tween")
  options.onComplete()
  await nextTick()
}
const pointer = async (
  element: Element,
  type: "pointerdown" | "pointerup",
  pointerType = "touch",
  clientX = 40
) => {
  element.dispatchEvent(new PointerEvent(type, { clientX, clientY: 40, pointerId: 1, pointerType }))
  await nextTick()
}

describe("Menu", () => {
  it("renders anonymous controls, leaves sort hidden and passes the resolved element to ImageSearcher", async () => {
    const setup = await render()
    expect(ids(setup)).toEqual(["image-searcher", "theme-toggler", "about-dialog", "login"])
    const searcher = setup.wrapper.getComponent(setup.ImageSearcher)
    expect(searcher.props()).toEqual({ menu: setup.wrapper.element })
    expect(searcher.attributes("tabindex")).toBe("0")
    expect(searcher.emitted("search")).toBeUndefined()
    expect(setup.wrapper.get("[data-item-id=login] button").attributes("tabindex")).toBe("0")
  })

  it.each([
    [false, "About", false],
    [true, "", false],
    [true, "About", true]
  ])(
    "shows About only for enabled settings and nonempty content: %s %j",
    async (show, description, visible) => {
      settings.value.showAboutDialog = show
      settings.value.aboutDialogDescription = description
      const setup = await render()
      expect(ids(setup).includes("about-dialog")).toBe(visible)
    }
  )

  it.each([
    [null, true, true, false],
    [{ admin: false }, true, false, false],
    [{ admin: true }, true, false, true],
    [null, false, false, false],
    ["saved value", true, false, false],
    [{ admin: "yes" }, false, false, true]
  ])(
    "uses user and login settings without normalizing stored truthy values: %j",
    async (user, enabled, login, dashboard) => {
      settings.value.showLoginLink = enabled
      const setup = await render({ user })
      expect(ids(setup).includes("login")).toBe(login)
      expect(ids(setup).includes("dashboard")).toBe(dashboard)
    }
  )

  it("reacts when settings and the signed-in user change", async () => {
    const setup = await render()
    settings.value.showLoginLink = false
    settings.value.showAboutDialog = false
    setup.auth.user = { admin: true }
    await nextTick()
    expect(ids(setup)).toEqual(["image-searcher", "theme-toggler", "dashboard"])
    setup.auth.user = null
    settings.value.showLoginLink = true
    await nextTick()
    expect(ids(setup)).toEqual(["image-searcher", "theme-toggler", "login"])
  })

  it.each([
    [null, "login", "/login"],
    [{ admin: true }, "dashboard", "/dashboard"]
  ])("navigates the %s menu target without invoking sort", async (user, id, target) => {
    const setup = await render({ user })
    const sort = vi.spyOn(setup.store, "setOrder")
    await setup.wrapper.get(`[data-item-id=${id}] button`).trigger("click")
    await vi.advanceTimersByTimeAsync(0)
    expect(setup.router.currentRoute.value.path).toBe(target)
    expect(setup.menu.isVisible.value).toBe(false)
    expect(setup.menu.shouldAnimate.value).toBe(false)
    expect(sort).not.toHaveBeenCalled()
  })

  it("marks a nested dashboard route active and does not reshow on a return to home without the gallery", async () => {
    const setup = await render({ path: "/dashboard/images", user: { admin: true } })
    expect(setup.wrapper.get("[data-item-id=dashboard]").classes()).toContain("active")
    expect(setup.wrapper.classes()).toContain("menu-hidden")
    await setup.router.push("/")
    await vi.advanceTimersByTimeAsync(50)
    expect(setup.menu.isVisible.value).toBe(false)
    expect(setup.wrapper.get("[data-item-id=dashboard]").classes()).not.toContain("active")
  })

  it("opens About using current settings and delegates the theme control", async () => {
    const setup = await render()
    await setup.wrapper.get(".about-dialog-button").trigger("click")
    expect(setup.dialog.dialogState).toMatchObject({
      description: "About the gallery",
      isOpen: true,
      title: "Hello",
      useX: true
    })
    await setup.wrapper.get(".theme-toggler-button").trigger("click")
    expect(setTheme).toHaveBeenCalledExactlyOnceWith("dark", { origin: { x: 179, y: 46 } })
  })

  it("toggles dormant sort through the authorized fixture and sends only orderBy to the store", async () => {
    const setup = await render()
    const sort = vi.spyOn(setup.store, "setOrder").mockImplementation((options) => {
      setup.store.orderBy = options?.orderBy
    })
    await revealSort(setup)
    const button = setup.wrapper.get("[data-item-id=sort-toggler] button")
    expect(button.get(".icon").attributes("name")).toBe("Shuffle")
    await button.trigger("click")
    expect(sort).toHaveBeenLastCalledWith({ orderBy: "date" })
    expect(button.get(".icon").attributes("name")).toBe("Calendar")
    expect(animation.set).toHaveBeenCalledWith(button.get(".icon").element, { rotation: -90 })
    expect(animation.to).toHaveBeenCalledWith(
      button.get(".icon").element,
      expect.objectContaining({ duration: 0.4, ease: "back.out(1.5)", rotation: 0 })
    )
    await button.trigger("click")
    expect(sort.mock.calls).toEqual([[{ orderBy: "date" }], [{ orderBy: null }]])
    expect(button.get(".icon").attributes("name")).toBe("Shuffle")
  })

  it("activates a menu button on touch release, suppresses its click and ignores a drag", async () => {
    const setup = await render()
    const sort = vi.spyOn(setup.store, "setOrder").mockImplementation((options) => {
      setup.store.orderBy = options?.orderBy
    })
    await revealSort(setup)
    const button = setup.wrapper.get("[data-item-id=sort-toggler] button")
    await pointer(button.element, "pointerdown")
    await pointer(button.element, "pointerup")
    expect(sort).toHaveBeenCalledOnce()
    await button.trigger("click")
    expect(sort).toHaveBeenCalledOnce()
    await pointer(button.element, "pointerdown")
    await pointer(button.element, "pointerup", "touch", 70)
    expect(sort).toHaveBeenCalledOnce()
    await pointer(button.element, "pointerdown", "mouse")
    await pointer(button.element, "pointerup", "mouse")
    expect(sort).toHaveBeenCalledOnce()
    await button.trigger("click")
    expect(sort).toHaveBeenCalledTimes(2)
  })

  it("shares show/hide state with galleries and gates focus through visibility animations", async () => {
    const setup = await render({ visible: false })
    expect(setup.wrapper.element.style.display).toBe("none")
    expect(setup.wrapper.get("[data-item-id=login] button").attributes("tabindex")).toBe("-1")
    setup.menu.show()
    await nextTick()
    expect(setup.wrapper.classes()).toContain("menu-animating")
    expect(animation.fromTo).toHaveBeenCalledWith(
      setup.wrapper.element,
      { opacity: 0, y: -100 },
      expect.objectContaining({ duration: 0.4, ease: "back.out(1.2)", opacity: 1, y: 0 })
    )
    await completeVisibility(true)
    expect(setup.wrapper.get("[data-item-id=login] button").attributes("tabindex")).toBe("0")
    setup.menu.hide()
    await nextTick()
    expect(animation.to).toHaveBeenCalledWith(
      setup.wrapper.element,
      expect.objectContaining({ duration: 0.3, ease: "back.in(1.2)", opacity: 0, y: -100 })
    )
    await completeVisibility(false)
    expect(setup.wrapper.element.style.display).toBe("flex")
    expect(setup.wrapper.get("[data-item-id=login] button").attributes("tabindex")).toBe("-1")
    setup.menu.show(false)
    await nextTick()
    setup.menu.hide(false)
    await nextTick()
    expect(setup.wrapper.element.style.display).toBe("none")
  })

  it("flushes pending hides immediately when focus is outside the menu", async () => {
    const setup = await render()
    const callback = vi.fn(() => expect(setup.menu.isVisible.value).toBe(false))
    setup.menu.requestHide(false, callback)
    await nextTick()
    expect(callback).toHaveBeenCalledOnce()
    expect(setup.menu.pendingHide.value).toBeNull()
    expect(setup.wrapper.classes()).toContain("menu-hidden")
  })

  it("defers pending hide while focused and flushes 50ms after outside focus-out", async () => {
    const setup = await render()
    const callback = vi.fn()
    setup.wrapper.get<HTMLButtonElement>("[data-item-id=login] button").element.focus()
    setup.menu.requestHide(false, callback)
    await nextTick()
    expect(callback).not.toHaveBeenCalled()
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    outside.focus()
    await vi.advanceTimersByTimeAsync(49)
    expect(callback).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(callback).toHaveBeenCalledOnce()
    expect(setup.menu.isVisible.value).toBe(false)
  })

  it("keeps pending work when focus moves between menu buttons and runs a lone callback on leaving", async () => {
    const setup = await render()
    const callback = vi.fn()
    setup.wrapper.get<HTMLButtonElement>("[data-item-id=login] button").element.focus()
    setup.menu.setHideCallback(callback)
    setup.wrapper.get<HTMLButtonElement>(".about-dialog-button").element.focus()
    await vi.advanceTimersByTimeAsync(50)
    expect(callback).not.toHaveBeenCalled()
    setup.wrapper.get<HTMLButtonElement>(".about-dialog-button").element.blur()
    await vi.advanceTimersByTimeAsync(50)
    expect(callback).toHaveBeenCalledOnce()
    expect(setup.menu.isVisible.value).toBe(true)
  })

  it("wires real ImageSearcher clicks without navigation and flushes the gallery search-collapse callback", async () => {
    const setup = await render()
    const collapse = vi.fn()
    const search = vi.spyOn(setup.store, "search").mockImplementation(() => {})
    setup.menu.setSearchCollapseCallback(collapse)
    await setup.wrapper.get(".search-button").trigger("click")
    expect(document.activeElement).toBe(setup.wrapper.get("input").element)
    await setup.wrapper.get("input").setValue("sony")
    expect(search).toHaveBeenLastCalledWith("sony")
    await setup.wrapper.get(".clear-button").trigger("click")
    expect(search).toHaveBeenLastCalledWith("")
    expect(collapse).toHaveBeenCalledOnce()
    expect(setup.router.currentRoute.value.path).toBe("/")
    expect(setup.wrapper.emitted("search")).toBeUndefined()
  })
})
