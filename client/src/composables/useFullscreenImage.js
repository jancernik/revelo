import { shallowRef, ref } from 'vue'

const imageData = shallowRef(null)
const flipId = ref(null)
const isAnimating = ref(false)

export function useFullscreenImage() {
  const show = (image, id) => {
    if (isAnimating.value) return
    imageData.value = image
    flipId.value = id
  }

  const hide = () => {
    if (isAnimating.value) return
    imageData.value = null
    flipId.value = null
  }

  return {
    imageData,
    flipId,
    isAnimating,
    show,
    hide
  }
}
