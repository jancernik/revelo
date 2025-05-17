<script setup>
import { ref, onMounted } from 'vue'
import ImageCard from '@/components/common/ImageCard.vue'
import api from '@/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const images = ref([])

const fetchImages = async () => {
  try {
    const response = await api.get('/images')
    images.value = response.data
    console.log('images.value: ', images.value)
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

<style lang="scss" scoped>
.image-gallery {
  display: block;
  columns: 200px 4;
  column-gap: $md-spacing;
  padding: $md-spacing * 2;
}
</style>
