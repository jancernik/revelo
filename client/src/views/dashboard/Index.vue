<script setup>
import Button from "#src/components/common/Button.vue"
import { useAuthStore } from "#src/stores/auth"
import Tasks from "#src/views/dashboard/Tasks.vue"
import { useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push("/")
}
</script>

<template>
  <div class="dashboard">
    <div class="routes">
      <h4>Routes</h4>
      <div class="routes-content">
        <router-link to="/dashboard/upload">
          <Button>Upload</Button>
        </router-link>
        <router-link to="/dashboard/settings">
          <Button>Settings</Button>
        </router-link>
      </div>
    </div>
    <Tasks />
    <div class="auth">
      <h4>Auth</h4>
      <div class="auth-content">
        <Button @click="handleLogout">Logout</Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.dashboard {
  @include flex-center;
  @include fill-parent;
  flex-direction: column;
  gap: var(--spacing-2);

  .routes,
  .auth {
    @include flex-center;
    flex-direction: column;
    gap: var(--spacing-2);
    .routes-content,
    .auth-content {
      @include flex-center;
      gap: var(--spacing-2);
    }
  }
}
</style>
