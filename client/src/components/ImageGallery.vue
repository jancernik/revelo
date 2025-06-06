<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import ImageCard from '@/components/ImageCard.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import api from '@/utils/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const images = ref([])
const animations = []

const fetchImages = async () => {
  try {
    const response = await api.get('/images')
    images.value = response.data
  } catch (error) {
    console.error('Error fetching images:', error)
  }
}

const getImageSrc = (image, type) => {
  return `${apiBaseUrl}/${image.versions.find((v) => v.type === type)?.path}`
}

const initAnimations = () => {
  gsap.registerPlugin(ScrollTrigger)
  console.log(gsap.utils.toArray('.image-card'));

  gsap.utils.toArray('.image-card').forEach((card, index) => {
    // Set initial state
    gsap.set(card, { opacity: 0, rotation: 0 });

    const animation = gsap.to(card, {
      scrollTrigger: {
        trigger: card,
        start: 'center bottom',
        end: 'bottom top', // Extended end point
        markers: index === 14,
        scrub: true,
        toggleActions: "play reverse play reverse",
        // onEnter, onLeave, onEnterBack, onLeaveBack
        // refreshPriority: -1 // Helps with timing conflicts
      },
      opacity: 1,
      rotation: 360,
      duration: 2,
      ease: "power2.inOut"
    })
    animations.push(animation)
  })
}

onMounted(async () => {
  await fetchImages()
  nextTick(() => {
    initAnimations()
  })
})
onUnmounted(() => {
  animations.forEach((animation) => animation.kill())
})
</script>

<template>
  <div v-if="images.length" class="image-gallery">
    <ImageCard
      v-for="(image, index) in images"
      :key="index"
      :src="getImageSrc(image, 'thumbnail')"
    />
  </div>
</template>

<style lang="scss">
.image-gallery {
  display: block;
  columns: 200px 4;
  column-gap: var(--spacing-12);
  padding: var(--spacing-12);
  max-width: 1300px;
  margin: 0 auto;
}
</style>
