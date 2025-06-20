<script setup>
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const props = defineProps({
  image: {
    required: true,
    type: Object
  }
})

const emit = defineEmits(['load', 'click'])

const getImageVersion = (type) => {
  return props.image?.versions?.find((v) => v.type === type)
}

const thumbnail = getImageVersion('thumbnail')

const handleClick = () => {
  emit('click', props.image, `img-${props.image.id}`)
}
</script>

<template>
  <div class="image-card" :data-flip-id="`img-${image.id}`" @click="handleClick">
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
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    user-select: none;
  }
}
</style>
