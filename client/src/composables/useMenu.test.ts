import { beforeEach, describe, expect, it, vi } from "vitest"

type UseMenu = typeof import("#src/composables/useMenu").useMenu

let useMenu: UseMenu
beforeEach(async () => {
  vi.resetModules()
  ;({ useMenu } = await import("#src/composables/useMenu"))
})

const snapshot = (menu: ReturnType<UseMenu>) => ({
  isVisible: menu.isVisible.value,
  pendingCallback: menu.pendingCallback.value,
  pendingHide: menu.pendingHide.value,
  shouldAnimate: menu.shouldAnimate.value
})

describe("useMenu", () => {
  it("starts hidden without animation or pending work", () => {
    expect(snapshot(useMenu())).toEqual({
      isVisible: false,
      pendingCallback: null,
      pendingHide: null,
      shouldAnimate: false
    })
  })

  it("shares one state between callers", () => {
    const menu = useMenu()
    const searcher = useMenu()
    menu.show()
    expect(searcher.isVisible.value).toBe(true)
    expect(searcher.shouldAnimate.value).toBe(true)
    searcher.hide(false)
    expect(menu.isVisible.value).toBe(false)
    expect(menu.shouldAnimate.value).toBe(false)
    expect(menu.isVisible).toBe(searcher.isVisible)
  })

  it("shows and hides with animation by default or as requested", () => {
    const menu = useMenu()
    menu.show(false)
    expect(snapshot(menu)).toMatchObject({ isVisible: true, shouldAnimate: false })
    menu.hide()
    expect(snapshot(menu)).toMatchObject({ isVisible: false, shouldAnimate: true })
    menu.show()
    expect(snapshot(menu)).toMatchObject({ isVisible: true, shouldAnimate: true })
  })

  it("keeps the animation flag when showing or hiding without a change", () => {
    const menu = useMenu()
    menu.show(true)
    menu.show(false)
    expect(snapshot(menu)).toMatchObject({ isVisible: true, shouldAnimate: true })
    menu.hide(false)
    menu.hide(true)
    expect(snapshot(menu)).toMatchObject({ isVisible: false, shouldAnimate: false })
  })

  it("drops a pending hide and its callback when shown or hidden directly", () => {
    const menu = useMenu()
    const callback = vi.fn()
    menu.show()
    menu.requestHide(true, callback)
    menu.show()
    expect(snapshot(menu)).toMatchObject({ pendingCallback: null, pendingHide: null })
    menu.requestHide(false, callback)
    menu.hide()
    expect(snapshot(menu)).toMatchObject({ pendingCallback: null, pendingHide: null })
    menu.setHideCallback(callback)
    menu.hide()
    expect(menu.pendingCallback.value).toBeNull()
    expect(callback).not.toHaveBeenCalled()
  })

  it("only requests a hide while visible", () => {
    const menu = useMenu()
    menu.requestHide(true, vi.fn())
    expect(snapshot(menu)).toMatchObject({ pendingCallback: null, pendingHide: null })
  })

  it("records a hide request without hiding", () => {
    const menu = useMenu()
    const callback = vi.fn()
    menu.show()
    menu.requestHide(false, callback)
    expect(snapshot(menu)).toEqual({
      isVisible: true,
      pendingCallback: callback,
      pendingHide: false,
      shouldAnimate: true
    })
    expect(callback).not.toHaveBeenCalled()
  })

  it("requests an animated hide by default and keeps an earlier callback without a new one", () => {
    const menu = useMenu()
    const callback = vi.fn()
    menu.show()
    menu.setHideCallback(callback)
    menu.requestHide()
    expect(snapshot(menu)).toMatchObject({ pendingCallback: callback, pendingHide: true })
  })

  it("cancels a pending hide and its callback", () => {
    const menu = useMenu()
    menu.show()
    menu.requestHide(true, vi.fn())
    menu.cancelPendingHide()
    expect(snapshot(menu)).toMatchObject({
      isVisible: true,
      pendingCallback: null,
      pendingHide: null
    })
  })

  it("sets a hide callback without requesting a hide, ignoring non-functions", () => {
    const menu = useMenu()
    const callback = vi.fn()
    menu.setHideCallback(callback)
    expect(snapshot(menu)).toMatchObject({ pendingCallback: callback, pendingHide: null })
    menu.setHideCallback(null)
    expect(menu.pendingCallback.value).toBe(callback)
  })

  it("flushes a pending hide with its animation flag and then runs the callback", () => {
    const menu = useMenu()
    const callback = vi.fn(() => {
      expect(menu.isVisible.value).toBe(false)
      expect(menu.pendingCallback.value).toBeNull()
    })
    menu.show()
    menu.requestHide(false, callback)
    menu.flushPendingHide()
    expect(callback).toHaveBeenCalledOnce()
    expect(snapshot(menu)).toEqual({
      isVisible: false,
      pendingCallback: null,
      pendingHide: null,
      shouldAnimate: false
    })
  })

  it("runs a lone hide callback on flush without hiding", () => {
    const menu = useMenu()
    const callback = vi.fn()
    menu.show()
    menu.setHideCallback(callback)
    menu.flushPendingHide()
    expect(callback).toHaveBeenCalledOnce()
    expect(snapshot(menu)).toMatchObject({ isVisible: true, pendingCallback: null })
  })

  it("does nothing on flush without pending work", () => {
    const menu = useMenu()
    menu.show(false)
    menu.flushPendingHide()
    expect(snapshot(menu)).toMatchObject({ isVisible: true, shouldAnimate: false })
  })

  it("discards a hide requested from within the flushed callback", () => {
    const menu = useMenu()
    const again = vi.fn()
    menu.show()
    menu.setHideCallback(() => {
      menu.show()
      menu.requestHide(true, again)
    })
    menu.flushPendingHide()
    expect(snapshot(menu)).toMatchObject({
      isVisible: true,
      pendingCallback: null,
      pendingHide: null
    })
    expect(again).not.toHaveBeenCalled()
  })

  it("keeps the latest search collapse callback and runs it on every flush", () => {
    const menu = useMenu()
    const first = vi.fn()
    const second = vi.fn()
    expect(() => menu.flushSearchCollapseCallback()).not.toThrow()
    menu.setSearchCollapseCallback(first)
    menu.setSearchCollapseCallback(second)
    menu.setSearchCollapseCallback(null)
    useMenu().flushSearchCollapseCallback()
    menu.flushSearchCollapseCallback()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(2)
  })
})
