<script setup>
import { ref, onMounted } from 'vue'
import ImageCard from '@/components/ImageCard.vue'
import api from '@/utils/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const images = ref([])

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

onMounted(fetchImages)
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
  column-gap: var(--spacing-3);
  padding: var(--spacing-6);
}
</style>
