<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"

import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth"
const { show: showToast } = useToast()

const authStore = useAuthStore()
const router = useRouter()

const handleRequestVerificationEmail = async () => {
  try {
    await authStore.resendVerificationEmail(authStore.user?.email)
    showToast({
      description: "Email sent. Please check your inbox.",
      duration: 3,
      title: "Verification Email Sent",
      type: "success"
    })
  } catch (error) {
    console.log("error: ", error)
    showToast({
      description: "There was an error sending the verification email.",
      duration: 3,
      title: "Error Sending Email",
      type: "error"
    })
  }
}

const redirectIfNotAuthenticated = () => {
  if (!authStore.user) {
    router.push("/signup")
  } else {
    if (authStore.user.emailVerified === false) {
      return
    }
    if (authStore.user?.admin) {
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
        <strong>{{ authStore.user?.email }}</strong
        >.
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
