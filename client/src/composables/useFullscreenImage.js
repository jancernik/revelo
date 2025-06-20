import { ref, shallowRef } from 'vue'

const imageData = shallowRef(null)
const isAnimating = ref(false)
const flipId = ref(null)
const smoother = ref(null)
const updateRoute = ref(true)
const triggerHide = ref(false)
const columnScrollTriggers = ref([])

let popstateHandler = null
let popstateCallback = null

export function useFullscreenImage() {
  const show = (image, options = {}) => {
    if (isAnimating.value) return

    flipId.value = options.flipId || null
    smoother.value = options.smoother || null
    updateRoute.value = options.updateRoute ?? true
    columnScrollTriggers.value = options.columnScrollTriggers ?? []

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
    smoother.value = null
    updateRoute.value = true
    columnScrollTriggers.value = []

    imageData.value = null
    triggerHide.value = false
    cleanup()
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

    window.addEventListener('popstate', popstateHandler)
  }

  const cleanup = () => {
    popstateCallback = null

    if (popstateHandler) {
      window.removeEventListener('popstate', popstateHandler)
      popstateHandler = null
    }
  }

  return {
    columnScrollTriggers,
    completeHide,
    flipId,
    hide,
    imageData,
    isAnimating,
    setPopstateCallback,
    show,
    smoother,
    triggerHide,
    updateRoute
  }
}
