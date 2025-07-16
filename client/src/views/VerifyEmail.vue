<script setup>
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import { useAuthStore } from "#src/stores/auth"

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const success = ref(false)
const error = ref(false)
const countdown = ref(3)

const verifyEmail = async () => {
  const token = route.query.token
  isLoading.value = true

  try {
    await authStore.verifyEmail(token)
    success.value = true

    for (let i = countdown.value; i > 0; i--) {
      setTimeout(
        () => {
          countdown.value = i
        },
        (countdown.value - i) * 1000
      )
    }

    setTimeout(() => {
      if (authStore.user?.admin) {
        router.push("/dashboard")
      } else {
        router.push("/")
      }
    }, 3000)
  } catch (err) {
    error.value = true
    console.error("Email verification failed:", err)
  } finally {
    isLoading.value = false
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

onMounted(redirectIfAuthenticated)
</script>

<template>
  <div class="verify-email">
    <div v-if="success" class="verify-card">
      <Icon class="success" name="CircleCheck" />
      <h3>Email Verified!</h3>
      <p>Your email has been successfully verified. Redirecting in {{ countdown }}...</p>
    </div>
    <div v-else-if="error" class="verify-card">
      <Icon class="error" name="CircleX" />
      <h3>Verification Failed</h3>
      <p>The verification link is invalid or has expired.</p>
    </div>

    <div v-else class="verify-card">
      <Icon name="Mail" />
      <h3>Email verification</h3>
      <p>Click the button below to verify your email address and activate your account.</p>
      <Button @click="verifyEmail">Verify Email</Button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.verify-email {
  @include flex-center;
  @include fill-parent;

  .icon {
    margin-inline: auto;

    &.success {
      color: var(--success);
    }

    &.error {
      color: var(--danger);
    }
  }

  .verify-card {
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-8);
    border: 1px solid var(--border);
    display: flex;
    gap: var(--spacing-4);
    flex-direction: column;
    text-align: center;

    h3 {
      text-align: center;
    }

    strong {
      font-weight: var(--font-bold);
    }
  }
}
</style>
