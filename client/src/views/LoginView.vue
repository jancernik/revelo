<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')

const handleLogin = async () => {
  try {
    await authStore.login({ username: username.value, password: password.value })
    if (authStore.user?.admin) {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error(error)
    alert('Login failed')
  }
}

const redirectIfAuthenticated = () => {
  if (authStore.user) {
    router.push('/')
  }
}

onMounted(redirectIfAuthenticated)
</script>

<template>
  <div class="auth-container">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="username" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
    <router-link to="/signup">Sign up</router-link>
  </div>
</template>
