<script setup>
const props = defineProps({
  image: {
    required: true,
    type: Object
  },
  shouldLoad: {
    default: false,
    type: Boolean
  }
})

const emit = defineEmits(["load", "click"])

const getImageVersion = (type) => {
  return props.image?.versions?.find((v) => v.type === type)
}

const thumbnail = getImageVersion("thumbnail")

const handleClick = () => {
  emit("click", props.image, `img-${props.image.id}`)
}
</script>

<template>
  <div class="image-card" :data-flip-id="`img-${image.id}`" @click="handleClick">
    <img
      :src="shouldLoad ? `/api/${thumbnail.path}` : null"
      :height="thumbnail.height"
      :width="thumbnail.width"
      :title="image.caption"
      :alt="image.caption"
      :data-id="image.id"
      @load="emit('load', image.id)"
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
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
  position: absolute;
  width: inherit;
  pointer-events: none;
  user-select: none;

  img {
    width: 100%;
    height: 100%;
    user-select: none;
    pointer-events: none;
  }
}
</style>
