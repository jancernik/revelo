<script setup lang="ts">
import { computed, onMounted } from "vue"
import { useRouter } from "vue-router"

import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth"
const { show: showToast } = useToast()

const authStore = useAuthStore()
const router = useRouter()

// The persisted auth user is unvalidated; the store keeps it unknown. The single
// template interpolation below is the supervisor-approved exception: rendering is
// identical for every runtime value (primitives yield undefined, missing or null
// emails render empty either way).
const userEmail = computed(() => {
  const user = authStore.user
  if (typeof user === "object" && user !== null && "email" in user) {
    return user.email
  }
  return undefined
})

const handleRequestVerificationEmail = async () => {
  const email = userEmail.value
  try {
    await authStore.resendVerificationEmail(typeof email === "string" ? email : undefined)
    showToast({
      description: "Email sent. Please check your inbox.",
      title: "Verification Email Sent",
      type: "success"
    })
  } catch (error) {
    console.log("error: ", error)
    showToast({
      description: "There was an error sending the verification email.",
      title: "Error Sending Email",
      type: "error"
    })
  }
}

const isAccount = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const redirectIfNotAuthenticated = () => {
  if (!authStore.user) {
    router.push("/signup")
  } else {
    const user = isAccount(authStore.user) ? authStore.user : null
    if (user?.emailVerified === false) {
      return
    }
    if (user?.admin) {
      router.push("/dashboard")
    } else {
      router.push("/")
    }
  }
}

onMounted(redirectIfNotAuthenticated)
</script>

<template>
  <div class="verification-pending">
    <div class="pending-card">
      <Icon name="Mail" />
      <h3>Check Your Email</h3>
      <p>
        Please verify your email address by clicking the link we sent to
        <strong>{{ userEmail }}</strong>.
      </p>
      <Button @click="handleRequestVerificationEmail">Resend Verification Email</Button>
    </div>
  </div>
</template>

<style lang="scss">
.verification-pending {
  @include flex-center;
  @include fill-parent;

  .icon {
    margin-inline: auto;
  }

  .pending-card {
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
