<script setup>
import { ref } from "vue"

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

const errorLoading = ref(false)
const emit = defineEmits(["load", "click"])

const getImageVersion = (type) => {
  return props.image?.versions?.find((v) => v.type === type)
}

const thumbnail = getImageVersion("thumbnail")

const handleClick = (event) => {
  emit("click", event, props.image, `img-${props.image.id}`)
}
</script>

<template>
  <div
    class="image-card"
    :data-flip-id="`img-${image.id}`"
    :class="{ 'not-loaded': !shouldLoad || errorLoading }"
    @click="handleClick"
  >
    <img
      :src="shouldLoad ? `/api/${thumbnail.path}` : null"
      :height="thumbnail.height"
      :width="thumbnail.width"
      :title="image.caption"
      :alt="image.caption"
      :data-id="image.id"
      @load="emit('load', image.id)"
      @error="errorLoading = true"
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
  user-select: none;
  @include light-dark-property(background-color, rgba(#171717, 0.05), rgba(#e5e5e5, 0.05));

  &.not-loaded::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: 200% 200%;
    border-radius: inherit;
    pointer-events: none;

    @include light-dark-property(
      animation,
      loading-light 1s infinite alternate ease-in-out,
      loading-dark 1s infinite alternate ease-in-out
    );
  }

  @keyframes loading-light {
    0% {
      background-color: rgba(#171717, 0.05);
    }
    100% {
      background-color: rgba(#171717, 0.15);
    }
  }

  @keyframes loading-dark {
    0% {
      background-color: rgba(#e5e5e5, 0.05);
    }
    100% {
      background-color: rgba(#e5e5e5, 0.15);
    }
  }

  &.not-loaded img {
    opacity: 0;
  }

  img {
    width: 100%;
    height: 100%;
    user-select: none;
    pointer-events: none;
  }
}
</style>
