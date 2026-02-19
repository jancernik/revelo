import { ref } from "vue"

const isVisible = ref(false)
const shouldAnimate = ref(false)
const pendingHide = ref(null)
const pendingCallback = ref(null)
const searchCollapseCallback = ref(null)

export function useMenu() {
  const show = (animate = true) => {
    pendingHide.value = null
    pendingCallback.value = null
    if (isVisible.value) return
    shouldAnimate.value = animate
    isVisible.value = true
  }

  const hide = (animate = true) => {
    pendingHide.value = null
    pendingCallback.value = null
    if (!isVisible.value) return
    shouldAnimate.value = animate
    isVisible.value = false
  }

  const requestHide = (animate = true, callback = null) => {
    if (!isVisible.value) return
    pendingHide.value = animate
    if (typeof callback !== "function") return
    pendingCallback.value = callback
  }

  const cancelPendingHide = () => {
    pendingHide.value = null
    pendingCallback.value = null
  }

  const setHideCallback = (callback) => {
    if (typeof callback !== "function") return
    pendingCallback.value = callback
  }

  const flushPendingHide = () => {
    const callback = pendingCallback.value
    if (pendingHide.value !== null) hide(pendingHide.value)
    callback?.()
    pendingHide.value = null
    pendingCallback.value = null
  }

  const setSearchCollapseCallback = (callback) => {
    if (typeof callback !== "function") return
    searchCollapseCallback.value = callback
  }

  const flushSearchCollapseCallback = () => {
    searchCollapseCallback.value?.()
  }

  return {
    cancelPendingHide,
    flushPendingHide,
    flushSearchCollapseCallback,
    hide,
    isVisible,
    pendingCallback,
    pendingHide,
    requestHide,
    setHideCallback,
    setSearchCollapseCallback,
    shouldAnimate,
    show
  }
}
