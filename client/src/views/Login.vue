<script setup lang="ts">
import { isAxiosError } from "axios"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import type { AuthPayload } from "#src/types/models"

import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { useSettings } from "#src/composables/useSettings"
import { useAuthStore } from "#src/stores/auth"

const authStore = useAuthStore()
const router = useRouter()
const { settings } = useSettings()

// The persisted auth user is unvalidated; the store keeps it unknown, so views
// narrow the fields they read without casts.
const isAccount = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

type LoginFailureBody = Partial<AuthPayload> & { requiresVerification?: boolean }

const username = ref("")
const password = ref("")
const loginError = ref("")
const isLoading = ref(false)
const showLoginForm = ref(false)
const showSignupButton = ref<boolean | undefined>(false)

const handleLogin = async () => {
  loginError.value = ""
  isLoading.value = true

  try {
    await authStore.login({ password: password.value, username: username.value })
    if (isAccount(authStore.user) && authStore.user.admin) {
      router.push("/dashboard")
    } else {
      router.push("/")
    }
  } catch (error) {
    const failure = isAxiosError<LoginFailureBody>(error) ? error.response?.data : undefined
    if (failure?.requiresVerification) {
      authStore.setUser(failure)
      router.push("/verification-pending")
    } else {
      loginError.value = "Invalid username or password."
    }
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
    console.error("Error getting config.", error)
    router.push("/")
  }
}

const redirectIfAuthenticated = () => {
  const user = isAccount(authStore.user) ? authStore.user : null
  if (!user?.emailVerified) {
    return
  }
  if (user?.admin) {
    router.push("/dashboard")
  } else {
    router.push("/")
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

          <RouterLink v-if="showSignupButton" to="/signup">
            <Button color="secondary">Sign Up</Button>
          </RouterLink>
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
      @include text("sm");
      color: var(--danger);
      margin-block: var(--spacing-4);
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
