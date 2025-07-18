<script setup>
import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { useSettings } from "#src/composables/useSettings"
import { useAuthStore } from "#src/stores/auth"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()
const email = ref("")
const username = ref("")
const password = ref("")
const signupErrors = ref([])
const isLoading = ref(false)
const showSignupForm = ref(false)
const { settings } = useSettings()

const handleSignup = async () => {
  signupErrors.value = []
  isLoading.value = true

  try {
    const result = await authStore.signup({
      email: email.value,
      password: password.value,
      username: username.value
    })

    if (result.data?.user) {
      if (result.data.user.emailVerified) {
        if (result.data.user.admin) {
          router.push("/dashboard")
        } else {
          router.push("/")
        }
      } else {
        router.push("/verification-pending")
      }
    } else {
      signupErrors.value.push("Signup failed. Please try again.")
    }
  } catch (error) {
    if (error.response.data?.data?.validation?.length) {
      const validation = error.response.data.data.validation
      const validationErrors = validation.map((v) => v.message)
      signupErrors.value = validationErrors
      return
    }
    const errorMessage = error.response?.data?.message || "Signup failed. Please try again."
    signupErrors.value = [errorMessage]
  } finally {
    isLoading.value = false
  }
}

const checkIfSignupsAreEnabled = async () => {
  try {
    if (settings.value.enableSignups) {
      showSignupForm.value = true
    } else {
      router.push("/login")
    }
  } catch (error) {
    console.error("Error getting config.", error)
    router.push("/")
  }
}

const redirectIfAuthenticated = () => {
  if (!authStore.user?.emailVerified) {
    return
  }
  if (authStore.user?.admin) {
    router.push("/dashboard")
  } else {
    router.push("/")
  }
}

onMounted(checkIfSignupsAreEnabled)
onMounted(redirectIfAuthenticated)
</script>

<template>
  <div class="signup">
    <div v-if="showSignupForm" class="signup-card">
      <h3>Sign Up</h3>
      <ul v-if="signupErrors.length" class="error-message">
        <li v-for="(error, index) in signupErrors" :key="index">{{ error }}</li>
      </ul>
      <form @submit.prevent="handleSignup">
        <Input
          v-model="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          icon="Mail"
          required
        />
        <Input
          v-model="username"
          label="Username"
          placeholder="Choose a username"
          icon="User"
          required
        />
        <Input
          v-model="password"
          type="password"
          label="Password"
          placeholder="Create a password"
          icon="Lock"
          required
        />

        <div class="actions">
          <Button type="submit" color="primary" :disabled="isLoading"> Sign Up </Button>

          <router-link to="/login">
            <Button color="secondary">Login</Button>
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss">
.signup {
  @include flex-center;
  @include fill-parent;

  .signup-card {
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-8);
    border: 1px solid var(--border);

    h3 {
      text-align: center;
    }

    .error-message {
      color: var(--danger);
      margin-block: var(--spacing-4);
      background-color: var(--danger-background);
      padding: var(--spacing-2) var(--spacing-4);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-2);
      list-style: none;

      li {
        @include text("sm");
      }
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
