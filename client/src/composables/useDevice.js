import { useWindowSize } from "#src/composables/useWindowSize"
import { computed } from "vue"

const MOBILE_BREAKPOINT = 650

export function useDevice() {
  const { width: windowWidth } = useWindowSize()

  const isMobile = computed(() => windowWidth.value < MOBILE_BREAKPOINT)

  return {
    isMobile
  }
}
