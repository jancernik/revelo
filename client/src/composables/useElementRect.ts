import type { ComponentPublicInstance, MaybeRefOrGetter } from "vue"

import { onMounted, onUnmounted, ref, toValue, watch } from "vue"

type ElementTarget = MaybeRefOrGetter<ComponentPublicInstance | Element | null | undefined>

export function useElementRect(target: ElementTarget) {
  function unrefElement(elRef: ElementTarget) {
    const plain = toValue(elRef)
    const element: unknown = plain && "$el" in plain ? (plain.$el ?? plain) : plain
    return element instanceof Element ? element : null
  }

  const x = ref(0)
  const y = ref(0)
  const width = ref(0)
  const height = ref(0)

  const update = () => {
    const element = unrefElement(target)
    if (!element) {
      x.value = 0
      y.value = 0
      width.value = 0
      height.value = 0
      return
    }

    const rect = element.getBoundingClientRect()
    x.value = rect.x
    y.value = rect.y
    width.value = rect.width
    height.value = rect.height
  }

  let resizeObserver: null | ResizeObserver = null

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

  return { height, width, x, y }
}
