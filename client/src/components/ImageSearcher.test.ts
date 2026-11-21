import type { gsap } from "gsap"
import type { Pinia } from "pinia"

import { enableAutoUnmount, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import { activatePinia, deferred, image, success } from "#src/stores/test/helpers"

interface Timeline {
  options: NonNullable<Parameters<typeof gsap.timeline>[0]>
  to: ReturnType<typeof vi.fn<(target: unknown, vars: gsap.TweenVars, position?: number) => void>>
}
const animation = vi.hoisted(() => ({
  set: vi.fn<(target: unknown, vars: gsap.TweenVars) => void>(),
  timeline: vi.fn<(options: gsap.TimelineVars) => Timeline>(),
  timelines: new Array<Timeline>()
}))
vi.mock("gsap", () => ({ gsap: animation }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))

const allImages = [image({ id: "sony" }), image({ id: "other" })]
let pinia: Pinia
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.useFakeTimers()
  pinia = activatePinia()
  animation.timelines.length = 0
  animation.timeline.mockImplementation((options) => {
    const timeline: Timeline = { options, to: vi.fn() }
    animation.timelines.push(timeline)
    return timeline
  })
  vi.stubGlobal("innerWidth", 800)
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains("search-button")
      ? new DOMRect(160, 10, 44, 36)
      : new DOMRect(100, 0, 200, 52)
  })
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

const render = async () => {
  const [{ default: ImageSearcher }, { useImagesStore }, { useMenu }, { default: api }] =
    await Promise.all([
      import("#src/components/ImageSearcher.vue"),
      import("#src/stores/images"),
      import("#src/composables/useMenu"),
      import("#src/utils/api")
    ])
  vi.mocked(api.get).mockResolvedValue(success({ images: allImages }))
  const store = useImagesStore()
  await store.fetchAll()
  vi.mocked(api.get).mockClear()
  const menu = document.createElement("aside")
  menu.className = "menu"
  menu.style.paddingLeft = "8px"
  menu.style.borderLeft = "1px solid black"
  const sibling = document.createElement("button")
  sibling.className = "sibling"
  menu.appendChild(sibling)
  document.body.appendChild(menu)
  const wrapper = mount(ImageSearcher, {
    attachTo: menu,
    global: { plugins: [pinia], stubs: { Icon: true } },
    props: { menu }
  })
  await nextTick()
  return { api, input: wrapper.get("input"), menu, menuState: useMenu(), sibling, store, wrapper }
}
type Setup = Awaited<ReturnType<typeof render>>
const expand = ({ wrapper }: Setup) => wrapper.get(".search-button").trigger("click")
const clear = ({ wrapper }: Setup) => wrapper.get(".clear-button").trigger("click")
const finish = async () => {
  const timeline = animation.timelines.at(-1)
  if (!timeline) throw new Error("Missing search animation")
  timeline.options.onComplete?.()
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

describe("ImageSearcher", () => {
  it("takes an element prop, renders collapsed controls and has no custom search emits", async () => {
    const { input, menu, wrapper } = await render()
    expect(wrapper.props("menu")).toBe(menu)
    expect(input.attributes()).toMatchObject({
      placeholder: "Search images...",
      tabindex: "-1",
      type: "text"
    })
    expect(input.element.style.paddingLeft).toBe("52px")
    expect(wrapper.get(".clear-button").attributes("tabindex")).toBe("-1")
    expect(wrapper.emitted("search")).toBeUndefined()
    expect(wrapper.emitted("expand")).toBeUndefined()
    expect(wrapper.emitted("collapse")).toBeUndefined()
  })

  it.each([800, 390])(
    "expands to the viewport limit at width %s, focuses and cancels pending hide",
    async (width) => {
      vi.stubGlobal("innerWidth", width)
      const setup = await render()
      const callback = vi.fn()
      setup.menuState.show(false)
      setup.menuState.requestHide(true, callback)
      await expand(setup)
      expect(setup.menuState.pendingHide.value).toBeNull()
      expect(setup.menuState.pendingCallback.value).toBeNull()
      expect(callback).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(setup.input.element)
      expect(setup.input.attributes("tabindex")).toBe("0")
      expect(animation.timelines[0]?.options.defaults).toMatchObject({
        duration: 0.5,
        ease: "power2.out"
      })
      expect(animation.timelines[0]?.to).toHaveBeenCalledWith(".menu", {
        width: Math.min(width - 32, 400)
      })
      expect(animation.timelines[0]?.to).toHaveBeenCalledWith(
        setup.wrapper.get(".search-button").element,
        expect.objectContaining({ duration: 0.3, x: -51 }),
        0
      )
      expect(animation.set).toHaveBeenCalledWith(setup.input.element, { paddingLeft: 52 })
      expect(setup.sibling.tabIndex).toBe(-1)
      await expand(setup)
      expect(animation.timeline).toHaveBeenCalledOnce()
    }
  )

  it("uses window resize measurements on the next expansion", async () => {
    const setup = await render()
    await expand(setup)
    await clear(setup)
    await finish()
    vi.stubGlobal("innerWidth", 320)
    window.dispatchEvent(new Event("resize"))
    await nextTick()
    await expand(setup)
    expect(animation.timelines.at(-1)?.to).toHaveBeenCalledWith(".menu", { width: 288 })
  })

  it("passes every input to the store immediately and the store debounces the latest API query for 300ms", async () => {
    const setup = await render()
    const search = vi.spyOn(setup.store, "search")
    await expand(setup)
    await setup.input.setValue("S")
    await vi.advanceTimersByTimeAsync(200)
    await setup.input.setValue(" SONY ")
    expect(search.mock.calls).toEqual([["S"], [" SONY "]])
    await vi.advanceTimersByTimeAsync(299)
    expect(setup.api.get).not.toHaveBeenCalled()
    const pending = deferred<ReturnType<typeof success<{ images: ReturnType<typeof image>[] }>>>()
    vi.mocked(setup.api.get).mockReturnValueOnce(pending.promise)
    await vi.advanceTimersByTimeAsync(1)
    expect(setup.api.get).toHaveBeenCalledExactlyOnceWith("/images/search", {
      params: { text: "sony" }
    })
    expect(setup.store.loading).toBe(true)
    expect(setup.input.element.value).toBe(" SONY ")
    pending.resolve(success({ images: [allImages[0]] }))
    await vi.advanceTimersByTimeAsync(0)
    expect(setup.store.loading).toBe(false)
    expect(setup.store.visibleFilteredImages.map((photo) => photo.id)).toEqual(["sony"])
    expect(setup.wrapper.emitted("search")).toBeUndefined()
  })

  it("applies empty search results and clearing restores the original images after the debounce", async () => {
    const setup = await render()
    vi.mocked(setup.api.get).mockResolvedValueOnce(success({ images: [] }))
    await expand(setup)
    await setup.input.setValue("no matches")
    await vi.advanceTimersByTimeAsync(300)
    expect(setup.store.visibleFilteredImages).toEqual([])
    await clear(setup)
    expect(setup.input.element.value).toBe("no matches")
    await finish()
    expect(setup.input.element.value).toBe("")
    await vi.advanceTimersByTimeAsync(299)
    expect(setup.store.visibleFilteredImages).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(setup.store.visibleFilteredImages).toEqual(allImages)
    expect(setup.api.get).toHaveBeenCalledOnce()
  })

  it("collapses to the original width, blurs, clears through the store and flushes the gallery callback", async () => {
    const setup = await render()
    const collapse = vi.fn()
    const search = vi.spyOn(setup.store, "search")
    setup.menuState.setSearchCollapseCallback(collapse)
    await expand(setup)
    await setup.input.setValue("sony")
    setup.menuState.show(false)
    setup.menuState.requestHide(true, vi.fn())
    await clear(setup)
    expect(document.activeElement).not.toBe(setup.input.element)
    expect(setup.input.attributes("tabindex")).toBe("-1")
    expect(search).toHaveBeenLastCalledWith("")
    expect(collapse).toHaveBeenCalledOnce()
    expect(setup.menuState.pendingHide.value).toBeNull()
    expect(animation.timelines.at(-1)?.to).toHaveBeenCalledWith(".menu", { width: 200 })
    expect(animation.set).toHaveBeenCalledWith(
      setup.wrapper.get(".search-input-container").element,
      { pointerEvents: "none" }
    )
    expect(setup.sibling.tabIndex).toBe(0)
    await clear(setup)
    expect(collapse).toHaveBeenCalledOnce()
    await finish()
    expect(setup.input.element.value).toBe("")
  })

  it("collapses with Escape and prevents its default action", async () => {
    const setup = await render()
    await expand(setup)
    await setup.input.setValue("sony")
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" })
    setup.input.element.dispatchEvent(event)
    await nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(setup.input.attributes("tabindex")).toBe("-1")
    expect(animation.timelines).toHaveLength(2)
  })

  it.each(["", "   "])("collapses on blur for an empty or whitespace query: %j", async (value) => {
    const setup = await render()
    await expand(setup)
    await setup.input.setValue(value)
    await setup.input.trigger("blur", { relatedTarget: setup.sibling })
    expect(setup.input.attributes("tabindex")).toBe("-1")
  })

  it("keeps a nonblank query expanded on blur and keeps an empty query when focus moves to clear", async () => {
    const setup = await render()
    await expand(setup)
    await setup.input.setValue("sony")
    await setup.input.trigger("blur", { relatedTarget: setup.sibling })
    expect(setup.input.attributes("tabindex")).toBe("0")
    await setup.input.setValue("")
    await setup.input.trigger("blur", { relatedTarget: setup.wrapper.get(".clear-button").element })
    expect(setup.input.attributes("tabindex")).toBe("0")
  })

  it("flushes the gallery callback even when focus stays inside the element prop (quirk)", async () => {
    const setup = await render()
    const collapse = vi.fn()
    setup.menuState.setSearchCollapseCallback(collapse)
    await expand(setup)
    await setup.input.setValue("sony")
    setup.menuState.show(false)
    setup.menuState.requestHide(true, vi.fn())
    await setup.wrapper.trigger("focusout", { relatedTarget: setup.sibling })
    expect(collapse).toHaveBeenCalledOnce()
    expect(setup.menuState.pendingHide.value).toBeNull()
    expect(setup.input.attributes("tabindex")).toBe("0")
  })

  it("does not flush focus-out callbacks while collapsed", async () => {
    const setup = await render()
    const collapse = vi.fn()
    setup.menuState.setSearchCollapseCallback(collapse)
    await setup.wrapper.trigger("focusout", { relatedTarget: document.body })
    expect(collapse).not.toHaveBeenCalled()
  })

  it("activates expand and clear on touch release and swallows each following click", async () => {
    const setup = await render()
    const expandButton = setup.wrapper.get(".search-button")
    const clearButton = setup.wrapper.get(".clear-button")
    await pointer(expandButton.element, "pointerdown")
    await pointer(expandButton.element, "pointerup")
    expect(animation.timeline).toHaveBeenCalledOnce()
    await expandButton.trigger("click")
    expect(animation.timeline).toHaveBeenCalledOnce()
    await pointer(clearButton.element, "pointerdown")
    await pointer(clearButton.element, "pointerup")
    expect(animation.timeline).toHaveBeenCalledTimes(2)
    await clearButton.trigger("click")
    expect(animation.timeline).toHaveBeenCalledTimes(2)
  })

  it("ignores dragged touch releases and leaves mouse activation to click", async () => {
    const setup = await render()
    const button = setup.wrapper.get(".search-button")
    await pointer(button.element, "pointerdown")
    await pointer(button.element, "pointerup", "touch", 70)
    expect(animation.timeline).not.toHaveBeenCalled()
    await pointer(button.element, "pointerdown", "mouse")
    await pointer(button.element, "pointerup", "mouse")
    expect(animation.timeline).not.toHaveBeenCalled()
    await button.trigger("click")
    expect(animation.timeline).toHaveBeenCalledOnce()
  })

  it("keeps controls usable with store loading and error state and leaves error presentation to the store", async () => {
    const setup = await render()
    setup.store.loading = true
    setup.store.error = "Search failed"
    await expand(setup)
    expect(setup.input.element.disabled).toBe(false)
    expect(setup.wrapper.text()).not.toContain("Search failed")
    expect(setup.wrapper.find(".loading, .error").exists()).toBe(false)
    await clear(setup)
    await vi.advanceTimersByTimeAsync(300)
    expect(setup.store.visibleFilteredImages).toEqual(allImages)
    expect(setup.store.error).toBe("Search failed")
  })
})
