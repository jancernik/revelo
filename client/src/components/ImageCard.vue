<script setup>
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const props = defineProps({
  image: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="image-card">
    <img :src="`${apiBaseUrl}/${image.path}`" :height="image.height" :width="image.width" alt="" />
  </div>
</template>

<style lang="scss">
.image-card {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-3);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    user-select: none;
  }
}
</style>
