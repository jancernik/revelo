<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api' // Using your custom Axios instance
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const selectedFile = ref(null)
const uploadMessage = ref('')
const images = ref([])
const apiBaseURL = import.meta.env.VITE_API_BASE_URL

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0]
}

const uploadImage = async () => {
  if (!selectedFile.value) return

  const formData = new FormData()
  formData.append('image', selectedFile.value)

  try {
    await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    uploadMessage.value = 'Upload successful!'
    selectedFile.value = null
    fetchImages()
  } catch (error) {
    uploadMessage.value = 'Error uploading image.'
    console.error(error)
  }
}

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
  <div class="upload-container">
    <h2>Upload Image</h2>
    <input type="file" @change="handleFileChange" />
    <button :disabled="!selectedFile" @click="uploadImage">Upload</button>

    <div v-if="uploadMessage" class="message">
      {{ uploadMessage }}
    </div>

    <h3>Uploaded Images</h3>
    <div v-if="images.length">
      <div v-for="image in images" :key="image.id" class="image-card">
        <img :src="`${apiBaseURL}/${image.path}`" :alt="image.filename" />
        <p>{{ image.filename }}</p>
      </div>
    </div>
    <div v-else>No images uploaded yet.</div>
  </div>
</template>

<style scoped>
.upload-container {
  max-width: 500px;
  margin: auto;
  text-align: center;
}
input {
  display: block;
  margin: 10px auto;
}
button {
  padding: 10px;
  margin: 10px;
  cursor: pointer;
}
.image-card {
  margin: 10px;
  display: inline-block;
}
img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 5px;
}
.message {
  color: green;
  margin-top: 10px;
}
</style>
