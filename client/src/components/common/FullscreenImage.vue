<script setup>
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { cssVar } from "#src/utils/helpers"
import { getImageVersion } from "#src/utils/helpers"
import { gsap } from "gsap"
import { Flip } from "gsap/Flip"
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue"
import { useRouter } from "vue-router"

const FLIP_DURATION = 0.6 // Duration for FLIP animation when zooming in/out
const FLIP_EASE = "power2.inOut" // Easing for FLIP animation when zooming in/out
const REGULAR_DURATION = 0.4 // Duration for regular fade/scale animation
const REGULAR_EASE = "power3.inOut" // Easing for regular fade/scale animation
const REGULAR_SCALE = 0.85 // Scale for regular animation when hiding

const {
  callOnReturn,
  callUpdatePositions,
  completeHide,
  flipId,
  imageData,
  isAnimating,
  setPopstateCallback,
  triggerHide,
  updateRoute
} = useFullscreenImage()
const router = useRouter()

const fullscreenContainerElement = useTemplateRef("fullscreen-image-container")
const fullscreenImageElement = computed(() => fullscreenElement.value?.querySelector("img"))
const fullscreenElement = useTemplateRef("fullscreen-image")
const thumbnailImageElement = computed(() => thumbnailElement.value?.querySelector("img"))
const thumbnailElement = computed(() => document.querySelector(`[data-flip-id="${flipId.value}"]`))

const regularImageVersion = computed(() => getImageVersion(imageData.value, "regular"))

const getThumbnailBorderRadius = () => {
  if (!thumbnailElement.value) return 0
  const styles = window.getComputedStyle(thumbnailElement.value)
  return parseFloat(styles.borderRadius) || 0
}

const getScaleRatio = () => {
  if (!thumbnailElement.value || !fullscreenElement.value) return 1

  const thumbnailRect = thumbnailElement.value.getBoundingClientRect()
  const imageRect = fullscreenElement.value.getBoundingClientRect()

  const thumbnailSize = Math.min(thumbnailRect.width, thumbnailRect.height)
  const imageSize = Math.min(imageRect.width, imageRect.height)

  return thumbnailSize / imageSize
}

const showFullscreenElements = () => {
  fullscreenElement.value.style.display = "flex"
  fullscreenContainerElement.value.style.display = "flex"
}

const hideFullscreenElements = () => {
  fullscreenElement.value.style.display = "none"
  fullscreenContainerElement.value.style.display = "none"
}

const onShowComplete = () => {
  isAnimating.value = false
}

const onHideComplete = () => {
  isAnimating.value = false
  hideFullscreenElements()
  completeHide()
}

const showWithFlipAnimation = () => {
  if (!thumbnailElement.value) {
    showWithRegularAnimation()
    return
  }

  const perform = () => {
    if (!thumbnailElement.value) return

    const borderRadius = getThumbnailBorderRadius()
    const scaleRatio = getScaleRatio()
    const scaledBorderRadius = borderRadius / scaleRatio

    fullscreenImageElement.value.style.borderRadius = `${scaledBorderRadius}px`
    fullscreenElement.value.style.borderRadius = `${scaledBorderRadius}px`

    const state = Flip.getState([thumbnailElement.value, fullscreenElement.value])

    thumbnailElement.value.style.visibility = "hidden"

    gsap.set(fullscreenElement.value, { opacity: 1 })
    gsap.set(fullscreenImageElement.value, { visibility: "visible" })

    Flip.from(state, {
      duration: FLIP_DURATION,
      ease: FLIP_EASE,
      onComplete: onShowComplete,
      scale: true
    })

    gsap.to([fullscreenImageElement.value, fullscreenElement.value], {
      borderRadius: cssVar("--radius-lg"),
      duration: FLIP_DURATION,
      ease: FLIP_EASE
    })
  }

  showFullscreenElements()
  gsap.set(fullscreenElement.value, { opacity: 0 })
  gsap.set(fullscreenImageElement.value, { visibility: "hidden" })

  if (fullscreenImageElement.value.complete) {
    perform()
  } else {
    fullscreenImageElement.value.onload = perform
  }
}

const hideWithFlipAnimation = () => {
  if (!thumbnailElement.value) {
    hideWithRegularAnimation()
    return
  }

  callUpdatePositions()

  const borderRadius = getThumbnailBorderRadius()
  const scaleRatio = getScaleRatio()
  const scaledBorderRadius = borderRadius * scaleRatio

  const state = Flip.getState([thumbnailElement.value, fullscreenElement.value])

  fullscreenElement.value.style.display = "none"
  thumbnailElement.value.style.visibility = "visible"

  Flip.from(state, {
    duration: FLIP_DURATION,
    ease: FLIP_EASE,
    onComplete: onHideComplete,
    opacity: 1,
    scale: true
  })

  gsap.from([thumbnailElement.value, thumbnailImageElement.value], {
    borderRadius: `${scaledBorderRadius}px`,
    duration: FLIP_DURATION,
    ease: FLIP_EASE
  })

  callOnReturn()
}

const showWithRegularAnimation = () => {
  showFullscreenElements()
  gsap.set(fullscreenImageElement.value, { visibility: "visible" })

  gsap.fromTo(
    fullscreenElement.value,
    { opacity: 0, scale: REGULAR_SCALE },
    {
      duration: REGULAR_DURATION,
      ease: REGULAR_EASE,
      onComplete: onShowComplete,
      opacity: 1,
      scale: 1
    }
  )
}

const hideWithRegularAnimation = () => {
  gsap.to(fullscreenElement.value, {
    duration: REGULAR_DURATION,
    ease: REGULAR_EASE,
    onComplete: onHideComplete,
    opacity: 0,
    scale: REGULAR_SCALE
  })
}

const showImage = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  if (flipId.value) {
    showWithFlipAnimation()
  } else {
    showWithRegularAnimation()
  }
}

const hideImage = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  if (flipId.value) {
    hideWithFlipAnimation()
    history.pushState({}, "", "/")
  } else {
    hideWithRegularAnimation()
    router.push("/")
  }
}

const createPopstateCallback = (animationFn) => () => {
  animationFn()
  history.pushState({}, "", "/")
}

watch(imageData, () => {
  if (imageData.value) {
    if (updateRoute.value) {
      history.pushState({}, "", `/images/${imageData.value.id}`)

      const callback = flipId.value
        ? createPopstateCallback(hideWithFlipAnimation)
        : createPopstateCallback(hideWithRegularAnimation)

      setPopstateCallback(callback)
    }
    nextTick(showImage)
  }
})

watch(triggerHide, () => {
  if (triggerHide.value) {
    nextTick(hideImage)
  }
})

onMounted(() => {
  gsap.registerPlugin(Flip)
})
</script>

<template>
  <div
    v-if="imageData"
    ref="fullscreen-image-container"
    class="fullscreen-image-container"
    @click="hideImage"
  >
    <div ref="fullscreen-image" class="fullscreen-image" :data-flip-id="flipId">
      <img :src="`/api/${regularImageVersion.path}`" alt="" />
    </div>
  </div>
</template>

<style lang="scss">
.fullscreen-image-container {
  @include fill-parent;
  @include flex-center;
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: z(overlay);
}

.fullscreen-image {
  position: relative;
  display: none;
  opacity: 0;
  will-change: transform, opacity;

  img {
    max-height: 90vh;
    max-width: 90vw;
    height: auto;
    width: auto;
    user-select: none;
    visibility: hidden;
    will-change: transform, opacity;
    object-fit: contain;
    border-radius: var(--radius-lg);
  }
}
</style>
