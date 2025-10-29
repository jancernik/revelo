<script setup>
import { getImageVersion } from "#src/utils/helpers"
import { ref } from "vue"

const props = defineProps({
  hasDragged: {
    default: false,
    type: Boolean
  },
  image: {
    required: true,
    type: Object
  },
  shouldLoad: {
    default: false,
    type: Boolean
  }
})

const emit = defineEmits(["load", "click", "tinyLoad"])

const errorLoading = ref(false)
const tinyLoaded = ref(false)
const thumbnailLoaded = ref(false)
const tiny = getImageVersion(props.image, "tiny")
const thumbnail = getImageVersion(props.image, "thumbnail")

const handleClick = (event) => {
  if (props.hasDragged) {
    event.preventDefault()
    return
  }
  emit("click", event, props.image, `img-${props.image.id}`)
}

const handleTinyLoad = () => {
  tinyLoaded.value = true
  emit("tinyLoad", props.image.id)
}

const handleThumbnailLoad = () => {
  thumbnailLoaded.value = true
  emit("load", props.image.id)
}
</script>

<template>
  <div
    class="image-card"
    :data-flip-id="`img-${image.id}`"
    :class="{ 'not-loaded': !shouldLoad || errorLoading }"
    tabindex="-1"
    @click="handleClick"
    @touchend="handleClick"
  >
    <img
      v-show="shouldLoad"
      class="thumbnail"
      :class="{ loaded: thumbnailLoaded }"
      :src="shouldLoad ? thumbnail.path : null"
      :height="thumbnail.height"
      :width="thumbnail.width"
      :title="image.captions?.en"
      :alt="image.captions?.en"
      :data-id="image.id"
      @load="handleThumbnailLoad"
      @error="errorLoading = true"
    />

    <img
      class="tiny-fallback"
      :class="{ loaded: tinyLoaded, hidden: thumbnailLoaded }"
      :src="tiny.path"
      :height="thumbnail.height"
      :width="thumbnail.width"
      :alt="image.captions?.en"
      @load="handleTinyLoad"
    />
  </div>
</template>

<style lang="scss">
.image-card {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  cursor: pointer;
  will-change: transform;
  backface-visibility: hidden;
  position: absolute;
  width: inherit;
  user-select: none;
  overflow: hidden;
  @include light-dark-property(background-color, rgba(#171717, 0.05), rgba(#e5e5e5, 0.05));
  transition: outline-offset 0.1s ease-in-out;

  &:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 3px;
  }

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

  &.not-loaded .thumbnail {
    opacity: 0;
  }

  img {
    width: 100%;
    height: 100%;
    user-select: none;
    pointer-events: none;
    border-radius: var(--radius-lg);
    color: transparent;

    &:-moz-loading {
      visibility: hidden;
    }
  }

  .tiny-fallback {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    filter: blur(15px);
    opacity: 0;
    transform: scale(1.05);
    transition: opacity 0.3s ease-out;
    pointer-events: none;

    &.loaded {
      opacity: 1;
      visibility: visible;
    }

    &.hidden {
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.4s ease-out,
        visibility 0.4s ease-out;
    }
  }

  &[style*="visibility: hidden"] .tiny-fallback {
    opacity: 0;
    visibility: hidden;
  }

  .thumbnail {
    position: relative;
    z-index: 2;
    opacity: 0;
    transition: opacity 0.4s ease-out;

    &.loaded {
      opacity: 1;
    }
  }
}
</style>
