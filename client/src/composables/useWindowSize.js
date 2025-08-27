import { onMounted, onUnmounted, ref } from "vue"

export function useWindowSize() {
  const width = ref(typeof window !== "undefined" ? window.innerWidth : 0)
  const height = ref(typeof window !== "undefined" ? window.innerHeight : 0)

  const update = () => {
    if (typeof window === "undefined") return
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  let cleanup = null

  onMounted(() => {
    update()
    window.addEventListener("resize", update, { passive: true })
    cleanup = () => window.removeEventListener("resize", update)
  })

  onUnmounted(() => cleanup?.())

  return { height, width }
}
