<script setup>
import { gsap } from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from "vue"

import ImageCard from "#src/components/ImageCard.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import api from "#src/utils/api"

const CENTER_DURATION = 1 // seconds
const ENTER_AND_EXIT_DURATION = 2 // seconds
const ENTER_AND_EXIT_INITIAL_DURATION = 1 // seconds
const ENTER_AND_EXIT_SCALE = 0.7 // scale factor
const TRANSFORM_ORIGIN_SCALE = -0.5 // scale factor
const ENTER_AND_EXIT_OPACITY = 1 // opacity factor
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
const columnScrollTriggers = []
const loadedImages = ref(0)

const imageGallery = useTemplateRef("image-gallery")
const smoothWrapper = useTemplateRef("smooth-wrapper")
const smoothContent = useTemplateRef("smooth-content")

const { show } = useFullscreenImage()

const shuffle = (array) => gsap.utils.shuffle(array)

const fetchImages = async () => {
  try {
    const response = await api.get("/images")
    imageData.value = response.data
  } catch (error) {
    console.error("Error fetching images:", error)
  }
}

const groupImages = (images = [], numberOfGroups) => {
  if (images.length === 0) return []
  if (!numberOfGroups || numberOfGroups <= 0) return images

  const imagesWithWeights = images.map((image) => {
    const regularVersion = image?.versions?.find((v) => v.type === "regular") || {}
    const height = regularVersion.height || 0
    const width = regularVersion.width || 0
    const aspectRatio = width > 0 ? height / width : 0

    return {
      ...image,
      _weight: aspectRatio
    }
  })

  imagesWithWeights.sort((a, b) => b._weight - a._weight)

  const groups = Array.from({ length: numberOfGroups }, () => [])
  const weightTrack = Array.from({ length: numberOfGroups }, () => 0)

  imagesWithWeights.forEach((image) => {
    let minIndex = 0
    for (let i = 1; i < weightTrack.length; i++) {
      if (weightTrack[i] < weightTrack[minIndex]) {
        minIndex = i
      }
    }

    const { _weight, ...cleanImage } = image
    weightTrack[minIndex] += _weight
    groups[minIndex].push(cleanImage)
  })

  groups.map((group) => shuffle(group))

  return groups
}

const initSmoother = () => {
  smoother.value = ScrollSmoother.create({
    content: smoothContent.value,
    effects: true,
    normalizeScroll: true,
    smooth: SMOOTH,
    smoothTouch: SMOOTH_TOUCH,
    wrapper: smoothWrapper.value
  })
}

const setupLagEffect = () => {
  if (!smoother.value) return
  const columns = imageGallery.value.querySelectorAll(".gallery-column")
  const middle = (columns.length - 1) / 2

  columns.forEach((column, index) => {
    const distance = Math.abs(index - middle)
    const lag = BASE_LAG + distance * LAG_SCALE
    const instance = smoother.value.effects(column, { lag, speed: 1 })
    columnScrollTriggers.push(instance[0])
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
  const columns = imageGallery.value.querySelectorAll(".gallery-column")

  columns.forEach((column) => {
    const imageCards = column.querySelectorAll(".image-card")

    imageCards.forEach((card) => {
      const timeline = gsap.timeline({
        defaults: {
          ease: "power1.inOut"
        },
        scrollTrigger: {
          end: () => `${-OFFSET + card.offsetHeight / 2}px ${END}%`,
          scrub: SCRUB,
          start: () => `${-OFFSET + card.offsetHeight / 2}px ${START}%`,
          trigger: card
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
          transformOrigin: () => `${xOrigin}px ${yOriginBottom}px`,
          y: OFFSET
        })
        .from(
          card,
          {
            duration: ENTER_AND_EXIT_INITIAL_DURATION,
            opacity: ENTER_AND_EXIT_OPACITY,
            transformOrigin: () => `${xOrigin}px ${yOriginBottom}px`
          },
          "<"
        )
        .to(card, {
          duration: CENTER_DURATION,
          opacity: 1,
          scale: 1,
          transformOrigin: () => `${xOrigin}px ${yOriginCenter}px`,
          y: 0
        })
        .to(card, {
          duration: ENTER_AND_EXIT_DURATION,
          scale: ENTER_AND_EXIT_SCALE,
          transformOrigin: () => `${xOrigin}px ${yOriginTop}px`,
          y: -OFFSET
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
  show(image, { columnScrollTriggers, flipId, smoother: smoother.value })
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
