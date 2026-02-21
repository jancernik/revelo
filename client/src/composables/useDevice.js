import { useWindowSize } from "#src/composables/useWindowSize"
import { computed, onMounted, onUnmounted, ref } from "vue"

const MOBILE_BREAKPOINT = 650

const getIsTouchPrimary = () => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches
}

export function useDevice() {
  const { width: windowWidth } = useWindowSize()
  const isMobile = computed(() => windowWidth.value < MOBILE_BREAKPOINT)
  const isTouchPrimary = ref(getIsTouchPrimary())

  let mediaQuery = null
  const handlePointerChange = (e) => {
    isTouchPrimary.value = e.matches
  }

  onMounted(() => {
    if (typeof window !== "undefined") {
      mediaQuery = window.matchMedia("(pointer: coarse)")
      mediaQuery.addEventListener("change", handlePointerChange)
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener("change", handlePointerChange)
    }
  })

  return {
    isMobile,
    isTouchPrimary
  }
}
