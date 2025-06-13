<script setup>
import { nextTick, watch, onMounted, useTemplateRef, computed } from 'vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  if (!imageData.value) return

  if (flipId.value) {
    isAnimating.value = true

    const thumbnailElement = document.querySelector(`[data-flip-id="${flipId.value}"]`)
    if (!thumbnailElement) {
      isAnimating.value = false
      return
    }

    imageElement.value.style.display = 'flex'
    containerElement.value.style.display = 'flex'

    if (!flipId.value) return

    const img = imageElement.value.querySelector('img')
    if (img.complete) {
      performInAnimation(thumbnailElement)
    } else {
      img.onload = () => performInAnimation(thumbnailElement)
    }
  } else {
    imageElement.value.style.display = 'flex'
    containerElement.value.style.display = 'flex'
  }
}

const performInAnimation = (thumbnailElement) => {
  const state = Flip.getState([thumbnailElement, imageElement.value])

  imageElement.value.style.display = 'flex'
  thumbnailElement.style.visibility = 'hidden'

  Flip.from(state, {
    duration: 0.8,
    ease: 'power3.inOut',
    scale: true,
    onComplete: () => {
      isAnimating.value = false
      // router.push({
      //   path: `/image/${imageData.value.id}`,
      //   replace: true
      // })
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
      // router.push({
      //   path: '/',
      //   replace: true
      // })
      hide()
    }
  })
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
