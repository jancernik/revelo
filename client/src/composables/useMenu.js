import { ref } from "vue"

const isVisible = ref(true)
const shouldAnimate = ref(false)

export function useMenu() {
  const show = (animate = true) => {
    shouldAnimate.value = animate
    isVisible.value = true
  }
  const hide = (animate = true) => {
    shouldAnimate.value = animate
    isVisible.value = false
  }

  return {
    hide,
    isVisible,
    shouldAnimate,
    show
  }
}
