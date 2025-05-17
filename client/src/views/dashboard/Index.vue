<script setup>
import RButton from '@/components/RButton.vue'
</script>

<template>
  <div class="dashboard">
    <router-link to="/dashboard/upload">
      <RButton>Upload</RButton>
    </router-link>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  @include flex-center;
  @include fill-parent;
}
</style>
