import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { image } from "#src/stores/test/helpers"

type Fullscreen = ReturnType<UseFullscreenImage>
type UseFullscreenImage = typeof import("#src/composables/useFullscreenImage").useFullscreenImage

let useFullscreenImage: UseFullscreenImage
let fullscreen: Fullscreen
beforeEach(async () => {
  vi.resetModules()
  ;({ useFullscreenImage } = await import("#src/composables/useFullscreenImage"))
  fullscreen = useFullscreenImage()
})
afterEach(() => {
  fullscreen.completeHide()
  vi.restoreAllMocks()
})

const options = (fullscreen: Fullscreen) => ({
  flipId: fullscreen.flipId.value,
  isThumbnailVisible: fullscreen.isThumbnailVisible.value,
  onReturn: fullscreen.onReturn.value,
  queryParams: fullscreen.queryParams.value,
  updateRoute: fullscreen.updateRoute.value
})

const popstate = () => window.dispatchEvent(new PopStateEvent("popstate"))

describe("useFullscreenImage", () => {
  it("starts closed with default options", () => {
    expect(fullscreen.imageData.value).toBeNull()
    expect(fullscreen.isAnimating.value).toBe(false)
    expect(fullscreen.triggerHide.value).toBe(false)
    expect(options(fullscreen)).toEqual({
      flipId: null,
      isThumbnailVisible: null,
      onReturn: null,
      queryParams: "",
      updateRoute: true
    })
  })

  it("opens an image with the given options", () => {
    const value = image()
    const isThumbnailVisible = () => true
    const onReturn = vi.fn()
    fullscreen.show(value, {
      flipId: "img-image-1",
      isThumbnailVisible,
      onReturn,
      queryParams: "?columns=3",
      updateRoute: false
    })
    expect(fullscreen.imageData.value).toBe(value)
    expect(options(fullscreen)).toEqual({
      flipId: "img-image-1",
      isThumbnailVisible,
      onReturn,
      queryParams: "?columns=3",
      updateRoute: false
    })
  })

  it("resets omitted and falsy options to their defaults on every open", () => {
    fullscreen.show(image(), {
      flipId: "a",
      onReturn: vi.fn(),
      queryParams: "?a",
      updateRoute: false
    })
    fullscreen.show(image({ id: "image-2" }), { flipId: "", queryParams: "" })
    expect(options(fullscreen)).toEqual({
      flipId: null,
      isThumbnailVisible: null,
      onReturn: null,
      queryParams: "",
      updateRoute: true
    })
    expect(fullscreen.imageData.value?.id).toBe("image-2")
  })

  it("shares the open image and flags between callers", () => {
    const viewer = useFullscreenImage()
    const value = image()
    fullscreen.show(value, { flipId: "img-image-1" })
    expect(viewer.imageData.value).toBe(value)
    expect(viewer.flipId.value).toBe("img-image-1")
    viewer.isAnimating.value = true
    expect(fullscreen.isAnimating.value).toBe(true)
  })

  it("ignores open and close requests while animating", () => {
    fullscreen.isAnimating.value = true
    fullscreen.show(image())
    expect(fullscreen.imageData.value).toBeNull()
    fullscreen.hide()
    expect(fullscreen.triggerHide.value).toBe(false)
  })

  it("asks the viewer to close and clears the request when reopened", () => {
    fullscreen.show(image())
    fullscreen.hide()
    expect(fullscreen.triggerHide.value).toBe(true)
    expect(fullscreen.imageData.value).not.toBeNull()
    fullscreen.show(image())
    expect(fullscreen.triggerHide.value).toBe(false)
  })

  it("resets everything once the viewer has closed", () => {
    const onReturn = vi.fn()
    fullscreen.show(image(), {
      flipId: "img-image-1",
      onReturn,
      queryParams: "?a",
      updateRoute: false
    })
    fullscreen.imageChanged()
    fullscreen.hide()
    fullscreen.completeHide()
    expect(fullscreen.imageData.value).toBeNull()
    expect(fullscreen.triggerHide.value).toBe(false)
    expect(options(fullscreen)).toEqual({
      flipId: null,
      isThumbnailVisible: null,
      onReturn: null,
      queryParams: "",
      updateRoute: true
    })
  })

  it("updates the gallery positions once per open", () => {
    const updatePositions = vi.fn()
    fullscreen.callUpdatePositions()
    fullscreen.show(image(), { updatePositions })
    fullscreen.callUpdatePositions()
    fullscreen.callUpdatePositions()
    expect(updatePositions).toHaveBeenCalledOnce()
    fullscreen.show(image(), { updatePositions })
    fullscreen.callUpdatePositions()
    expect(updatePositions).toHaveBeenCalledTimes(2)
  })

  it("keeps the position updater after closing until the next open", () => {
    const updatePositions = vi.fn()
    fullscreen.show(image(), { updatePositions })
    fullscreen.completeHide()
    fullscreen.callUpdatePositions()
    expect(updatePositions).toHaveBeenCalledOnce()
  })

  it("notifies the gallery of the return once, with whether the image changed", () => {
    const onReturn = vi.fn()
    fullscreen.callOnReturn(true, 1)
    fullscreen.show(image(), { onReturn })
    fullscreen.imageChanged()
    fullscreen.callOnReturn(true, 0.5)
    fullscreen.callOnReturn(false)
    expect(onReturn).toHaveBeenCalledOnce()
    expect(onReturn).toHaveBeenCalledWith(true, true, 0.5)
  })

  it("reports an image switched back to the original as unchanged", () => {
    const onReturn = vi.fn()
    fullscreen.show(image(), { onReturn })
    fullscreen.imageChanged()
    fullscreen.imageRestoredToOriginal()
    fullscreen.callOnReturn(false)
    expect(onReturn).toHaveBeenCalledWith(false, false, undefined)
  })

  it("keeps the changed-image flag across opens until the viewer closes", () => {
    const onReturn = vi.fn()
    fullscreen.show(image())
    fullscreen.imageChanged()
    fullscreen.show(image(), { onReturn })
    fullscreen.callOnReturn(true, 1)
    expect(onReturn).toHaveBeenLastCalledWith(true, true, 1)
    fullscreen.completeHide()
    fullscreen.show(image(), { onReturn })
    fullscreen.callOnReturn(true, 1)
    expect(onReturn).toHaveBeenLastCalledWith(true, false, 1)
  })

  it("adds one popstate listener while open and removes it on close", () => {
    const add = vi.spyOn(window, "addEventListener")
    const remove = vi.spyOn(window, "removeEventListener")
    fullscreen.show(image())
    fullscreen.show(image())
    const registrations = add.mock.calls.filter(([type]) => type === "popstate")
    expect(registrations).toHaveLength(1)
    fullscreen.completeHide()
    expect(remove).toHaveBeenCalledWith("popstate", registrations[0]?.[1])
  })

  it("runs the popstate callback once on browser back and stops listening", () => {
    const callback = vi.fn()
    const remove = vi.spyOn(window, "removeEventListener")
    fullscreen.show(image())
    fullscreen.setPopstateCallback(callback)
    popstate()
    expect(callback).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith("popstate", expect.any(Function))
    popstate()
    expect(callback).toHaveBeenCalledOnce()
    expect(fullscreen.imageData.value).not.toBeNull()
  })

  it("uses the latest popstate callback", () => {
    const first = vi.fn()
    const second = vi.fn()
    fullscreen.show(image())
    fullscreen.setPopstateCallback(first)
    useFullscreenImage().setPopstateCallback(second)
    popstate()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })

  it("keeps listening when browser back arrives without a callback", () => {
    const callback = vi.fn()
    fullscreen.show(image())
    popstate()
    fullscreen.setPopstateCallback(callback)
    popstate()
    expect(callback).toHaveBeenCalledOnce()
  })

  it("ignores browser back without an open image", () => {
    const callback = vi.fn()
    fullscreen.show(image())
    fullscreen.setPopstateCallback(callback)
    fullscreen.imageData.value = null
    popstate()
    expect(callback).not.toHaveBeenCalled()
  })

  it("drops the popstate callback on close", () => {
    const callback = vi.fn()
    fullscreen.show(image())
    fullscreen.setPopstateCallback(callback)
    fullscreen.completeHide()
    fullscreen.show(image())
    popstate()
    expect(callback).not.toHaveBeenCalled()
  })

  it("opens without an image and still listens for browser back", () => {
    const add = vi.spyOn(window, "addEventListener")
    fullscreen.show(null, { updateRoute: false })
    expect(fullscreen.imageData.value).toBeNull()
    expect(fullscreen.updateRoute.value).toBe(false)
    expect(add).toHaveBeenCalledWith("popstate", expect.any(Function))
  })
})
