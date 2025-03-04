<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import ImageUploader from '@/components/ImageUploader.vue'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div>
    <h2>{{ authStore.user?.username }}</h2>
    <button @click="logout">Logout</button>
    <ImageUploader />
  </div>
</template>
