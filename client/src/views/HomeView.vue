<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

console.log(authStore.user)

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <h2>{{ authStore.user?.username }}</h2>
    <button @click="logout">Logout</button>
  </div>
</template>
