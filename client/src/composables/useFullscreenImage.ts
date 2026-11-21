import { ref, shallowRef } from "vue"

import type { Image } from "#src/types/models"

export type FullscreenReturnHandler = (
  withTarget: boolean,
  isDifferentImage: boolean,
  duration?: number
) => void

export interface FullscreenShowOptions {
  flipId?: null | string
  isThumbnailVisible?: (() => boolean) | null
  onReturn?: FullscreenReturnHandler | null
  queryParams?: string
  updatePositions?: (() => void) | null
  updateRoute?: boolean
}

const imageData = shallowRef<Image | null>(null)
const isAnimating = ref(false)
const flipId = ref<null | string>(null)
const updateRoute = ref(true)
const triggerHide = ref(false)
const updatePositions = ref<(() => void) | null>(null)
const updatePositionsCalled = ref(false)
const onReturn = ref<FullscreenReturnHandler | null>(null)
const onReturnCalled = ref(false)
const isThumbnailVisible = ref<(() => boolean) | null>(null)
const isDifferentImage = ref(false)
const queryParams = ref("")

let popstateHandler: (() => void) | null = null
let popstateCallback: (() => void) | null = null

export function useFullscreenImage() {
  const show = (image: Image | null, options: FullscreenShowOptions = {}) => {
    if (isAnimating.value) return

    flipId.value = options.flipId || null
    updateRoute.value = options.updateRoute ?? true
    updatePositions.value = options.updatePositions || null
    updatePositionsCalled.value = false
    onReturn.value = options.onReturn || null
    onReturnCalled.value = false
    isThumbnailVisible.value = options.isThumbnailVisible || null
    queryParams.value = options.queryParams || ""

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
    isDifferentImage.value = false
    queryParams.value = ""

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

  const callOnReturn = (withTarget: boolean, duration?: number) => {
    if (onReturn.value && !onReturnCalled.value) {
      onReturnCalled.value = true
      onReturn.value(withTarget, isDifferentImage.value, duration)
    }
  }

  const imageChanged = () => {
    isDifferentImage.value = true
  }

  const imageRestoredToOriginal = () => {
    isDifferentImage.value = false
  }

  const setPopstateCallback = (callback: () => void) => {
    popstateCallback = callback
  }

  const initialize = () => {
    if (popstateHandler) return

    popstateHandler = () => {
      if (imageData.value && popstateCallback) {
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
    imageChanged,
    imageData,
    imageRestoredToOriginal,
    isAnimating,
    isThumbnailVisible,
    onReturn,
    queryParams,
    setPopstateCallback,
    show,
    triggerHide,
    updateRoute
  }
}
