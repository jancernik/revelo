<script setup>
import { nextTick, watch, onMounted, useTemplateRef, computed } from 'vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const { imageData, flipId, isAnimating, hide } = useFullscreenImage()

const imageElement = useTemplateRef('image')
const containerElement = useTemplateRef('container')

const regularImage = computed(() => {
  return imageData.value?.versions?.find((v) => v.type === 'regular') || {}
})

const handleClick = () => {
  if (!isAnimating.value) {
    animateOut()
  }
}

const animateIn = async () => {
  if (!imageData.value || !flipId.value) return

  isAnimating.value = true

  const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
  if (!thumbnailElement) {
    isAnimating.value = false
    return
  }

  imageElement.value.style.display = 'none'
  containerElement.value.style.display = 'flex'

  const img = imageElement.value.querySelector('img')
  if (img.complete) {
    performAnimation(thumbnailElement)
  } else {
    img.onload = () => performAnimation(thumbnailElement)
  }
}

const performAnimation = (thumbnailElement) => {
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

const animateOut = () => {
  if (!flipId.value) return

  isAnimating.value = true

  const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
  if (!thumbnailElement) {
    hide()
    isAnimating.value = false
    return
  }

  const state = Flip.getState([thumbnailElement, imageElement.value])

  imageElement.value.style.display = 'none'
  thumbnailElement.style.visibility = 'visible'

  Flip.from(state, {
    duration: 0.8,
    ease: 'power3.inOut',
    scale: true,
    onComplete: () => {
      containerElement.value.style.display = 'none'
      isAnimating.value = false
      hide()
    }
  }).pause(0.4)
}

watch(imageData, async (newImageData) => {
  if (newImageData) {
    nextTick(animateIn)
  }
})

onMounted(() => {
  gsap.registerPlugin(Flip)
})
</script>

<template>
  <div v-show="imageData" ref="container" class="fullscreen-image-container" @click="handleClick">
    <div ref="image" class="fullscreen-image" :data-flip-id="flipId">
      <img :src="`${apiBaseUrl}/${regularImage.path}`" alt="" />
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
