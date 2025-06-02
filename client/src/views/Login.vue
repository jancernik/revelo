<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
import { useSettings } from '@/composables/useSettings'

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const password = ref('')
const loginError = ref('')
const isLoading = ref(false)
const showLoginForm = ref(false)
const showSignupButton = ref(false)
const { settings } = useSettings()

const handleLogin = async () => {
  loginError.value = ''
  isLoading.value = true

  try {
    await authStore.login({ username: username.value, password: password.value })
    if (authStore.user?.admin) {
      router.push('/dashboard')
    } else {
      router.push('/')
    }
  } catch (error) {
    loginError.value = 'Invalid username or password.'
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const checkIfSignupsAreEnabled = async () => {
  try {
    showSignupButton.value = settings.value.enableSignups
    showLoginForm.value = true
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
  <div class="login">
    <div v-if="showLoginForm" class="login-card">
      <h3>Login</h3>
      <div v-if="loginError" class="error-message">{{ loginError }}</div>
      <form @submit.prevent="handleLogin">
        <Input
          v-model="username"
          label="Username"
          placeholder="Enter your username"
          icon="User"
          required
        />
        <Input
          v-model="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          icon="Lock"
          required
        />

        <div class="actions">
          <Button type="submit" color="primary" :disabled="isLoading"> Login </Button>

          <router-link v-if="showSignupButton" to="/signup">
            <Button color="secondary">Sign Up</Button>
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss">
.login {
  @include flex-center;
  @include fill-parent;

  .login-card {
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-8);
    border: 1px solid var(--border);

    h3 {
      text-align: center;
    }

    .error-message {
      @include text('sm');
      color: var(--danger);
      margin-bottom: var(--spacing-6);
      text-align: center;
      background-color: var(--danger-background);
      padding: var(--spacing-2) var(--spacing-4);
      border-radius: var(--radius-md);
    }

    form {
      display: flex;
      gap: var(--spacing-4);
      flex-direction: column;
    }
    .actions {
      @include flex-center;
      flex-direction: column;
      gap: var(--spacing-3);
      padding-top: var(--spacing-2);

      button {
        width: 100%;
      }
    }

    a {
      width: 100%;
    }
  }
}
</style>
