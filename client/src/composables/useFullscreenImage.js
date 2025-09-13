import { ref, shallowRef } from "vue"

const imageData = shallowRef(null)
const isAnimating = ref(false)
const flipId = ref(null)
const updateRoute = ref(true)
const triggerHide = ref(false)
const updatePositions = ref(null)
const updatePositionsCalled = ref(false)
const onReturn = ref(null)
const onReturnCalled = ref(false)
const isThumbnailVisible = ref(null)

let popstateHandler = null
let popstateCallback = null

export function useFullscreenImage() {
  const show = (image, options = {}) => {
    if (isAnimating.value) return

    flipId.value = options.flipId || null
    updateRoute.value = options.updateRoute ?? true
    updatePositions.value = options.updatePositions || null
    updatePositionsCalled.value = false
    onReturn.value = options.onReturn || null
    onReturnCalled.value = false
    isThumbnailVisible.value = options.isThumbnailVisible || null

    imageData.value = image
    triggerHide.value = false
    initialize()
  }

  const hide = () => {
    if (isAnimating.value) return
    triggerHide.value = true
  }

  const completeHide = () => {
    flipId.value = null
    updateRoute.value = true
    onReturn.value = null
    onReturnCalled.value = false
    isThumbnailVisible.value = null

    imageData.value = null
    triggerHide.value = false
    cleanup()
  }

  const callUpdatePositions = () => {
    if (updatePositions.value && !updatePositionsCalled.value) {
      updatePositionsCalled.value = true
      updatePositions.value()
    }
  }

  const callOnReturn = (withTarget) => {
    if (onReturn.value && !onReturnCalled.value) {
      onReturnCalled.value = true
      onReturn.value(withTarget)
    }
  }

  const setPopstateCallback = (callback) => {
    popstateCallback = callback
  }

  const initialize = () => {
    if (popstateHandler) return

    popstateHandler = () => {
      if (imageData.value && !isAnimating.value && popstateCallback) {
        popstateCallback()
        cleanup()
      }
    }

    window.addEventListener("popstate", popstateHandler)
  }

  const cleanup = () => {
    popstateCallback = null

    if (popstateHandler) {
      window.removeEventListener("popstate", popstateHandler)
      popstateHandler = null
    }
  }

  return {
    callOnReturn,
    callUpdatePositions,
    completeHide,
    flipId,
    hide,
    imageData,
    isAnimating,
    isThumbnailVisible,
    onReturn,
    setPopstateCallback,
    show,
    triggerHide,
    updateRoute
  }
}
