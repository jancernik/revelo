<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import RInput from '@/components/RInput.vue'
import RButton from '@/components/RButton.vue'
import api from '@/api'

const authStore = useAuthStore()
const router = useRouter()
const email = ref('')
const username = ref('')
const password = ref('')
const signupError = ref('')
const isLoading = ref(false)
const showSignupForm = ref(false)

const handleSignup = async () => {
  signupError.value = ''
  isLoading.value = true

  try {
    await authStore.signup({
      email: email.value,
      username: username.value,
      password: password.value
    })
    if (authStore.user?.admin) {
      router.push('/dashboard')
    } else {
      router.push('/')
    }
  } catch (error) {
    signupError.value = 'Signup failed. Please try again.'
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const checkIfSignupsAreEnabled = async () => {
  try {
    const response = await api.get('/settings/enableSignups')
    if (response.data?.value) {
      showSignupForm.value = true
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
    router.push('/dashboard')
  }
}

onMounted(checkIfSignupsAreEnabled)
onMounted(redirectIfAuthenticated)
</script>

<template>
  <div v-if="showSignupForm" class="signup-card">
    <h1>Sign Up</h1>
    <div v-if="signupError" class="error-message">{{ signupError }}</div>
    <form @submit.prevent="handleSignup">
      <RInput
        v-model="email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        icon="Mail"
        required
      />
      <RInput
        v-model="username"
        label="Username"
        placeholder="Choose a username"
        icon="User"
        required
      />
      <RInput
        v-model="password"
        type="password"
        label="Password"
        placeholder="Create a password"
        icon="Lock"
        required
      />

      <div class="form-actions">
        <RButton type="submit" color="primary" :disabled="isLoading"> Sign Up </RButton>

        <router-link to="/login">
          <RButton color="secondary">Login</RButton>
        </router-link>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.signup-card {
  border-radius: 0.75rem;
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border: 1px solid #e4e4e4;

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #181818;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    text-align: center;
    background-color: #f3e2e2;
    padding: 0.5rem 1rem;
    line-height: 1.25rem;
    border-radius: 0.375rem;
  }

  form {
    display: flex;
    gap: 1rem;
    flex-direction: column;
  }

  .form-actions {
    @include flex-center;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;

    button {
      width: 100%;
    }
  }
}
</style>
