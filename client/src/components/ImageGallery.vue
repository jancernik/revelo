<script setup>
import ImageCard from "#src/components/ImageCard.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useImagesStore } from "#src/stores/images"
import { gsap } from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue"

const BASE_LAG = 0.5 // seconds
const LAG_SCALE = 0.5 // seconds
const SMOOTH = 1 // seconds
const SMOOTH_TOUCH = 0.2 // seconds
const COLUMNS = 7 // number of columns

const imageData = ref([])
const groupedImages = ref([])
const smoother = ref(null)
const columnScrollTriggers = []
const loadedImageIds = ref(new Set())

const imageGallery = useTemplateRef("image-gallery")
const smoothWrapper = useTemplateRef("smooth-wrapper")
const smoothContent = useTemplateRef("smooth-content")

const imagesStore = useImagesStore()
const { show: showFullscreenImage } = useFullscreenImage()

const shuffle = (array) => gsap.utils.shuffle(array)

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

watch(
  () => imagesStore.filteredImages,
  () => {
    console.log("test")
    imageData.value = imagesStore.filteredImages
    groupedImages.value = groupImages(imagesStore.filteredImages, COLUMNS)

    const currentImageIds = new Set(imagesStore.filteredImages.map((img) => img.id))
    const stillLoadedIds = new Set(
      [...loadedImageIds.value].filter((id) => currentImageIds.has(id))
    )
    loadedImageIds.value = stillLoadedIds
  },
  { deep: true, immediate: true }
)

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

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)

  if (loadedImageIds.value.size === imageData.value.length) {
    nextTick(setupLagEffect)
  }
}

const handleThumbnailClick = (image, flipId) => {
  showFullscreenImage(image, { columnScrollTriggers, flipId, smoother: smoother.value })
}

const allImagesLoaded = computed(() => {
  return loadedImageIds.value.size === imagesStore.filteredImages.length
})

onMounted(async () => {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
  nextTick(initSmoother)
})

onUnmounted(() => {
  smoother.value?.kill()
})
</script>

<template>
  <div ref="smooth-wrapper" class="smooth-wrapper">
    <div ref="smooth-content" class="smooth-content">
      <div v-show="allImagesLoaded" ref="image-gallery" class="image-gallery">
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
