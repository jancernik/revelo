<script setup>
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const props = defineProps({
  image: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['load'])

const getImageVersion = (type) => {
  return props.image?.versions?.find((v) => v.type === type)
}

const thumbnail = getImageVersion('thumbnail')
</script>

<template>
  <div class="image-card">
    <img
      :src="`${apiBaseUrl}/${thumbnail.path}`"
      :height="thumbnail.height"
      :width="thumbnail.width"
      alt=""
      @load="emit('load')"
      @error="emit('load')"
    />
  </div>
</template>

<style lang="scss">
.image-card {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    user-select: none;
  }
}
</style>
