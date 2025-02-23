<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const images = ref([])
const apiBaseURL = import.meta.env.VITE_API_BASE_URL

const fetchImages = async () => {
  try {
    const response = await api.get('/images')
    images.value = response.data
  } catch (error) {
    console.error('Error fetching images:', error)
  }
}

onMounted(fetchImages)
</script>

<template>
  <div v-if="images.length" class="image-container">
    <div v-for="image in images" :key="image.id" class="image-card">
      <img :src="`${apiBaseURL}/${image.path}`" :alt="image.filename" />
    </div>
  </div>
</template>

<style scoped>
.image-card {
  display: flex;
}

.image-card img {
  width: 100%;
  height: auto;
}

.image-container {
  display: flex;
  max-width: 300px;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
