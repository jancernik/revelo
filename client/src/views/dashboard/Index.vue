<script setup>
import Button from '@/components/common/Button.vue'
</script>

<template>
  <div class="dashboard">
    <router-link to="/dashboard/upload">
      <Button>Upload</Button>
    </router-link>
    <router-link to="/dashboard/settings">
      <Button>Settings</Button>
    </router-link>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  @include flex-center;
  @include fill-parent;
}
</style>
