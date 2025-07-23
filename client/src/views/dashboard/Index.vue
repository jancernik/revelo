<script setup>
import Button from "#src/components/common/Button.vue"
import Tasks from "#src/views/dashboard/Tasks.vue"
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
  </div>
</template>

<style lang="scss">
.dashboard {
  @include flex-center;
  @include fill-parent;
  flex-direction: column;
  gap: var(--spacing-2);

  .routes {
    @include flex-center;
    flex-direction: column;
    gap: var(--spacing-2);
    .routes-content {
      @include flex-center;
      gap: var(--spacing-2);
    }
  }
}
</style>
