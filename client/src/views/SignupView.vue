<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const email = ref('')
const username = ref('')
const password = ref('')

const handleSignup = async () => {
  try {
    await authStore.signup({
      email: email.value,
      username: username.value,
      password: password.value
    })
    router.push('/')
  } catch (error) {
    console.error(error)
    alert('Signup failed')
  }
}
</script>

<template>
  <div class="auth-container">
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
