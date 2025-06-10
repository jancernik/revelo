<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import ImageCard from '@/components/ImageCard.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import api from '@/utils/api'

const CENTER_DURATION = 1 // seconds
const ENTER_AND_EXIT_DURATION = 2 // seconds
const OFFSET = 100 // pixels
const START = 100 // percent
const END = 0 // percent
const SCRUB = 0.5 // seconds

const images = ref([])
const timelines = []

const fetchImages = async () => {
  try {
    const response = await api.get('/images')
    images.value = response.data
  } catch (error) {
    console.error('Error fetching images:', error)
  }
}

const getImageVersion = (image, type) => {
  return image.versions.find((v) => v.type === type)
}

const initAnimations = () => {
  gsap.registerPlugin(ScrollTrigger)

  gsap.utils.toArray('.image-card').forEach((item, index) => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: item,
        start: () => `${(OFFSET - item.offsetHeight / 2) * -1}px ${START}%`,
        end: () => `${(OFFSET - item.offsetHeight / 2) * -1}px ${END}%`,
        scrub: SCRUB
      }
    })

    timeline
      .from(item, {
        y: OFFSET,
        duration: ENTER_AND_EXIT_DURATION,
        opacity: 0,
        scale: 0.7
      })
      .to(item, {
        y: 0,
        duration: CENTER_DURATION,
        opacity: 1,
        scale: 1
      })
      .to(item, {
        y: -OFFSET,
        duration: ENTER_AND_EXIT_DURATION,
        opacity: 0,
        scale: 0.7
      })

    timelines.push(timeline)
  })
}

onMounted(async () => {
  await fetchImages()
  nextTick(() => {
    initAnimations()
  })
})
onUnmounted(() => {
  timelines.forEach((timeline) => timeline.kill())
})
</script>

<template>
  <div v-if="images.length" class="image-gallery">
    <ImageCard
      v-for="(image, index) in images"
      :key="index"
      :image="getImageVersion(image, 'thumbnail')"
    />
  </div>
</template>

<style lang="scss">
.image-gallery {
  display: block;
  columns: 200px 5;
  column-gap: var(--spacing-3);
  padding: var(--spacing-3);
  max-width: 1300px;
  margin: 0 auto;
}
</style>
