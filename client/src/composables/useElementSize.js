import { onMounted, onUnmounted, ref, toValue, watch } from "vue"

export function useElementSize(target) {
  function unrefElement(elRef) {
    const plain = toValue(elRef)
    return plain?.$el ?? plain
  }

  const width = ref(0)
  const height = ref(0)

  const update = () => {
    const element = unrefElement(target)
    if (!element) {
      width.value = 0
      height.value = 0
      return
    }

    width.value = element.offsetWidth
    height.value = element.offsetHeight
  }

  let resizeObserver = null

  onMounted(() => {
    update()

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => update())
      const element = unrefElement(target)
      if (element) resizeObserver.observe(element)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  watch(
    () => unrefElement(target),
    (newElement, oldElement) => {
      if (resizeObserver) {
        if (oldElement instanceof Element) {
          resizeObserver.unobserve(oldElement)
        }
        if (newElement instanceof Element) {
          resizeObserver.observe(newElement)
        }
      }
      update()
    }
  )

  return { height, width }
}
