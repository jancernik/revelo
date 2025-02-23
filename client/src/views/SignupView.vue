<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import api from '@/api'

const authStore = useAuthStore()
const router = useRouter()
const email = ref('')
const username = ref('')
const password = ref('')
const showSignup = ref(false)

const handleSignup = async () => {
  try {
    await authStore.signup({
      email: email.value,
      username: username.value,
      password: password.value
    })
    if (authStore.user?.admin) {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error(error)
    alert('Signup failed')
  }
}

const redirectIfDisabled = async () => {
  try {
    const response = await api.get('/config')
    if (response.data?.enableSignups) {
      showSignup.value = true
    } else {
      router.push('/login')
    }
  } catch (error) {
    console.error('Error getting config.', error)
    router.push('/')
  }
}

const redirectIfAuthenticated = () => {
  if (authStore.user) {
    router.push('/')
  }
}

onMounted(redirectIfDisabled)
onMounted(redirectIfAuthenticated)
</script>

<template>
  <div v-if="showSignup" class="auth-container">
    <h2>Sign Up</h2>
    <form @submit.prevent="handleSignup">
      <input v-model="email" placeholder="Email" required />
      <input v-model="username" placeholder="Username" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
    </form>
    <router-link to="/login">Login</router-link>
  </div>
</template>
