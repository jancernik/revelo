<script setup>
import { ref, onMounted, onUnmounted, nextTick, useTemplateRef } from 'vue'
import ImageCard from '@/components/ImageCard.vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import api from '@/utils/api'

const CENTER_DURATION = 1 // seconds
const ENTER_AND_EXIT_DURATION = 2 // seconds
const ENTER_AND_EXIT_INITIAL_DURATION = 1 // seconds
const ENTER_AND_EXIT_SCALE = 0.7 // scale factor
const TRANSFORM_ORIGIN_SCALE = -0.5 // scale factor
const ENTER_AND_EXIT_OPACITY = 0 // opacity factor
const OFFSET = 100 // pixels
const START = 100 // percent
const END = 0 // percent
const SCRUB = 1 // seconds
const BASE_LAG = 0.5 // seconds
const LAG_SCALE = 0.5 // seconds
const SMOOTH = 1 // seconds
const SMOOTH_TOUCH = 0.2 // seconds
const COLUMNS = 7 // number of columns

const imageData = ref([])
const groupedImages = ref([])
const smoother = ref(null)
const timelines = []
const loadedImages = ref(0)

const imageGallery = useTemplateRef('image-gallery')
const smoothWrapper = useTemplateRef('smooth-wrapper')
const smoothContent = useTemplateRef('smooth-content')

const { show } = useFullscreenImage()

const shuffle = (array) => gsap.utils.shuffle(array)

const fetchImages = async () => {
  try {
    const response = await api.get('/images')
    imageData.value = response.data
  } catch (error) {
    console.error('Error fetching images:', error)
  }
}

const groupImages = (images = [], numberOfGroups) => {
  if (images.length === 0) return []
  if (!numberOfGroups || numberOfGroups <= 0) return images
  const groups = Array.from({ length: numberOfGroups }, () => [])
  images.forEach((image, index) => {
    groups[index % numberOfGroups].push(image)
  })
  return groups
}

const initSmoother = () => {
  smoother.value = ScrollSmoother.create({
    smooth: SMOOTH,
    smoothTouch: SMOOTH_TOUCH,
    wrapper: smoothWrapper.value,
    content: smoothContent.value,
    normalizeScroll: true,
    effects: true
  })
}

const setupLagEffect = () => {
  if (!smoother.value) return
  const columns = imageGallery.value.querySelectorAll('.gallery-column')
  const middle = (columns.length - 1) / 2

  columns.forEach((column, index) => {
    const distance = Math.abs(index - middle)
    const lag = BASE_LAG + distance * LAG_SCALE
    smoother.value.effects(column, { speed: 1, lag })
  })
}

const getHorizontalOrigin = (element) => {
  const rect = element.getBoundingClientRect()
  const windowCenter = window.innerWidth / 2
  const elementCenter = rect.left + element.offsetWidth / 2
  const distanceFromScreenCenter = elementCenter - windowCenter
  const scaledDistance = distanceFromScreenCenter * TRANSFORM_ORIGIN_SCALE
  return element.offsetWidth / 2 - scaledDistance
}

const setupTimelines = () => {
  const columns = imageGallery.value.querySelectorAll('.gallery-column')

  columns.forEach((column) => {
    const imageCards = column.querySelectorAll('.image-card')

    imageCards.forEach((card) => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: () => `${-OFFSET + card.offsetHeight / 2}px ${START}%`,
          end: () => `${-OFFSET + card.offsetHeight / 2}px ${END}%`,
          scrub: SCRUB
        },
        defaults: {
          ease: 'power1.inOut'
        }
      })

      const yOriginTop = 0
      const yOriginBottom = card.offsetHeight
      const yOriginCenter = card.offsetHeight / 2
      const xOrigin = getHorizontalOrigin(card)
      timeline
        .from(card, {
          duration: ENTER_AND_EXIT_DURATION,
          scale: ENTER_AND_EXIT_SCALE,
          y: OFFSET,
          transformOrigin: () => `${xOrigin}px ${yOriginBottom}px`
        })
        .from(
          card,
          {
            duration: ENTER_AND_EXIT_INITIAL_DURATION,
            opacity: ENTER_AND_EXIT_OPACITY,
            transformOrigin: () => `${xOrigin}px ${yOriginBottom}px`
          },
          '<'
        )
        .to(card, {
          duration: CENTER_DURATION,
          scale: 1,
          y: 0,
          opacity: 1,
          transformOrigin: () => `${xOrigin}px ${yOriginCenter}px`
        })
        .to(card, {
          duration: ENTER_AND_EXIT_DURATION,
          scale: ENTER_AND_EXIT_SCALE,
          y: -OFFSET,
          transformOrigin: () => `${xOrigin}px ${yOriginTop}px`
        })

      timelines.push(timeline)
    })
  })
}

const handleImageLoad = () => {
  loadedImages.value++
  if (loadedImages.value === imageData.value.length) {
    nextTick(() => {
      setupLagEffect()
      setupTimelines()
    })
  }
}

const handleThumbnailClick = (image, flipId) => {
  show(image, { flipId })
}

onMounted(async () => {
  await fetchImages()
  groupedImages.value = groupImages(shuffle(imageData.value), COLUMNS)
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
  nextTick(() => {
    initSmoother()
  })
})

onUnmounted(() => {
  smoother.value?.kill()
  timelines.forEach((timeline) => timeline.kill())
})
</script>

<template>
  <div ref="smooth-wrapper" class="smooth-wrapper">
    <div ref="smooth-content" class="smooth-content">
      <div v-show="loadedImages === imageData.length" ref="image-gallery" class="image-gallery">
        <div v-for="(group, index) in groupedImages" :key="index" class="gallery-column">
          <ImageCard
            v-for="image in group"
            :key="image.id"
            :identifier="image.id"
            :image="image"
            @load="handleImageLoad"
            @click="handleThumbnailClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.image-gallery {
  display: flex;
  flex-direction: row;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
}
.gallery-column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
</style>
