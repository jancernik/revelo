<script setup>
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { cssVar } from "#src/utils/helpers"
import { gsap } from "gsap"
import { Flip } from "gsap/Flip"
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue"

const ZOOM_FLIP_DURATION = 0.6 // Duration for FLIP animation when zooming in/out
const ZOOM_FLIP_EASE = "power2.inOut" // Easing for FLIP animation when zooming in/out

const {
  callOnReturn,
  completeHide,
  flipId,
  hide,
  imageData,
  isAnimating,
  setPopstateCallback,
  triggerHide,
  updateRoute
} = useFullscreenImage()

const imageElement = useTemplateRef("image")
const containerElement = useTemplateRef("container")

const regularImageVersion = computed(() => {
  return imageData.value?.versions?.find((v) => v.type === "regular") || {}
})

const handleClick = () => {
  if (isAnimating.value) return
  history.pushState({}, "", "/")
  hide()
}

const showWithFlipAnimation = () => {
  const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
  if (!thumbnailElement) {
    showWithRegularAnimation()
    return
  }

  imageElement.value.style.display = "flex"
  containerElement.value.style.display = "flex"

  gsap.set(imageElement.value, { opacity: 0 })
  gsap.set(imageElement.value.querySelector("img"), { visibility: "hidden" })

  const perform = () => {
    const thumbnailStyles = window.getComputedStyle(thumbnailElement)
    const thumbnailBorderRadius = parseFloat(thumbnailStyles.borderRadius) || 0

    const thumbnailRect = thumbnailElement.getBoundingClientRect()
    const imageRect = imageElement.value.getBoundingClientRect()

    const thumbnailSize = Math.min(thumbnailRect.width, thumbnailRect.height)
    const imageSize = Math.min(imageRect.width, imageRect.height)
    const scaleRatio = thumbnailSize / imageSize

    imageElement.value.style.borderRadius = `${thumbnailBorderRadius / scaleRatio}px`

    const state = Flip.getState([thumbnailElement, imageElement.value])

    thumbnailElement.style.visibility = "hidden"
    gsap.set(imageElement.value, { opacity: 1 })
    gsap.set(imageElement.value.querySelector("img"), { visibility: "visible" })

    Flip.from(state, {
      duration: ZOOM_FLIP_DURATION,
      ease: ZOOM_FLIP_EASE,
      onComplete: () => {
        isAnimating.value = false
      },
      scale: true
    })

    gsap.to(imageElement.value, {
      borderRadius: cssVar("--radius-lg"),
      duration: ZOOM_FLIP_DURATION,
      ease: ZOOM_FLIP_EASE
    })
  }

  const img = imageElement.value.querySelector("img")
  if (img.complete) {
    perform()
  } else {
    img.onload = () => perform()
  }
}

const hideWithFlipAnimation = () => {
  const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
  if (!thumbnailElement) {
    hideWithRegularAnimation()
    return
  }

  // Calculate the same proportional border radius for the reverse animation
  const thumbnailStyles = window.getComputedStyle(thumbnailElement)
  const thumbnailBorderRadius = parseFloat(thumbnailStyles.borderRadius) || 0

  const thumbnailRect = thumbnailElement.getBoundingClientRect()
  const imageRect = imageElement.value.getBoundingClientRect()

  const thumbnailSize = Math.min(thumbnailRect.width, thumbnailRect.height)
  const imageSize = Math.min(imageRect.width, imageRect.height)
  const scaleRatio = thumbnailSize / imageSize

  const fullscreenBorderRadius = thumbnailBorderRadius * scaleRatio

  const state = Flip.getState([thumbnailElement, imageElement.value])

  imageElement.value.style.display = "none"
  thumbnailElement.style.visibility = "visible"

  Flip.from(state, {
    duration: ZOOM_FLIP_DURATION,
    ease: ZOOM_FLIP_EASE,
    onComplete: () => {
      imageElement.value.style.display = "none"
      containerElement.value.style.display = "none"
      isAnimating.value = false
      completeHide()
    },
    opacity: 1,
    scale: true
  })

  gsap.fromTo(
    thumbnailElement,
    {
      borderRadius: `${fullscreenBorderRadius}px`
    },
    {
      borderRadius: `${thumbnailBorderRadius}px`,
      duration: ZOOM_FLIP_DURATION,
      ease: ZOOM_FLIP_EASE
    }
  )

  callOnReturn()
}

const showWithRegularAnimation = () => {
  imageElement.value.style.display = "flex"
  containerElement.value.style.display = "flex"

  gsap.set(imageElement.value.querySelector("img"), { visibility: "visible" })

  gsap.fromTo(
    imageElement.value,
    {
      opacity: 0,
      scale: 0.8
    },
    {
      duration: 0.5,
      ease: "power3.inOut",
      onComplete: () => {
        isAnimating.value = false
      },
      opacity: 1,
      scale: 1
    }
  )
}

const hideWithRegularAnimation = () => {
  gsap.to(imageElement.value, {
    duration: 0.5,
    ease: "power3.inOut",
    onComplete: () => {
      imageElement.value.style.display = "none"
      containerElement.value.style.display = "none"
      isAnimating.value = false
      completeHide()
    },
    opacity: 0,
    scale: 0.8
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
  } else {
    hideWithRegularAnimation()
  }
}

watch(imageData, () => {
  if (imageData.value) {
    if (updateRoute.value) {
      history.pushState({}, "", `/images/${imageData.value.id}`)

      if (flipId.value) {
        setPopstateCallback(() => {
          hideWithFlipAnimation()
          history.pushState({}, "", "/")
        })
      } else {
        setPopstateCallback(() => {
          hideWithRegularAnimation()
          history.pushState({}, "", "/")
        })
      }
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
  <div v-if="imageData" ref="container" class="fullscreen-image-container" @click="handleClick">
    <div ref="image" class="fullscreen-image" :data-flip-id="flipId">
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
  display: none;
  overflow: hidden;
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
  }
}
</style>
