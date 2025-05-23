<script setup>
defineProps({
  src: {
    type: String,
    required: true
  }
})
</script>

<template>
  <div class="image-card">
    <img :src="src" alt="" />
  </div>
</template>

<style lang="scss" scoped>
.image-card {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: $md-spacing;
  overflow: hidden;
  transition: 0.15s cubic-bezier(0.86, 0, 0.07, 1);
}

img {
  width: 100%;
  height: 100%;
  user-select: none;
}
</style>
