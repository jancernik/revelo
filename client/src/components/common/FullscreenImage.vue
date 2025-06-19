<script setup>
import { nextTick, watch, onMounted, useTemplateRef, computed } from 'vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const {
  imageData,
  flipId,
  isAnimating,
  setPopstateCallback,
  updateRoute,
  hide,
  triggerHide,
  completeHide
} = useFullscreenImage()

const imageElement = useTemplateRef('image')
const containerElement = useTemplateRef('container')

const regularImageVersion = computed(() => {
  return imageData.value?.versions?.find((v) => v.type === 'regular') || {}
})

const handleClick = () => {
  if (isAnimating.value) return
  history.pushState({}, '', '/')
  hide()
}

const showWithFlipAnimation = () => {
  const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
  console.log('thumbnailElement: ', thumbnailElement)
  if (!thumbnailElement) {
    showWithRegularAnimation()
    return
  }

  imageElement.value.style.display = 'flex'
  containerElement.value.style.display = 'flex'

  const perform = () => {
    const state = Flip.getState([thumbnailElement, imageElement.value])

    imageElement.value.style.display = 'flex'
    thumbnailElement.style.visibility = 'hidden'

    Flip.from(state, {
      duration: 0.8,
      ease: 'power3.inOut',
      scale: true,
      onComplete: () => {
        isAnimating.value = false
      }
    })
  }

  const img = imageElement.value.querySelector('img')
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

  const state = Flip.getState([thumbnailElement, imageElement.value])

  imageElement.value.style.display = 'none'
  thumbnailElement.style.visibility = 'visible'

  Flip.from(state, {
    duration: 0.8,
    ease: 'power3.inOut',
    scale: true,
    opacity: 1,
    onComplete: () => {
      imageElement.value.style.display = 'none'
      containerElement.value.style.display = 'none'
      isAnimating.value = false
      completeHide()
    }
  })
}

const showWithRegularAnimation = () => {
  imageElement.value.style.display = 'flex'
  containerElement.value.style.display = 'flex'

  gsap.fromTo(
    imageElement.value,
    {
      opacity: 0,
      scale: 0.8
    },
    {
      duration: 0.5,
      opacity: 1,
      scale: 1,
      ease: 'power3.inOut',
      onComplete: () => {
        isAnimating.value = false
      }
    }
  )
}

const hideWithRegularAnimation = () => {
  gsap.to(imageElement.value, {
    duration: 0.5,
    opacity: 0,
    scale: 0.8,
    ease: 'power3.inOut',
    onComplete: () => {
      imageElement.value.style.display = 'none'
      containerElement.value.style.display = 'none'
      isAnimating.value = false
      completeHide()
    }
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
      history.pushState({}, '', `/image/${imageData.value.id}`)

      if (flipId.value) {
        setPopstateCallback(() => {
          hideWithFlipAnimation()
          history.pushState({}, '', '/')
        })
      } else {
        setPopstateCallback(() => {
          hideWithRegularAnimation()
          history.pushState({}, '', '/')
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
  <div v-show="imageData" ref="container" class="fullscreen-image-container" @click="handleClick">
    <div ref="image" class="fullscreen-image" :data-flip-id="flipId">
      <img :src="`${apiBaseUrl}/${regularImageVersion.path}`" alt="" />
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

  img {
    height: 90vh;
    width: auto;
    user-select: none;
  }
}
</style>
