<script setup>
import Icon from "#src/components/common/Icon.vue"
const emit = defineEmits(["remove"])

defineProps({
  allowDelete: {
    default: false,
    type: Boolean
  },
  images: {
    required: true,
    type: Array
  },
  showFileNames: {
    default: false,
    type: Boolean
  },
  showFileSizes: {
    default: false,
    type: Boolean
  }
})
</script>

<template>
  <div class="simple-image-grid">
    <div v-for="(image, index) in images" :key="index" class="image-item">
      <div class="image-container">
        <img :src="image.src" :alt="image.name" />
        <div v-if="allowDelete" class="remove-button" @click="() => emit('remove', index)">
          <Icon name="X" />
        </div>
      </div>
      <div v-if="showFileNames || showFileSizes" class="image-info">
        <div v-if="showFileNames" class="file-name">{{ image.name }}</div>
        <div v-if="showFileSizes" class="file-size">
          {{ (image.size / (1024 * 1024)).toFixed(2) }} MB
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.simple-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  width: 100%;
  gap: var(--spacing-6);

  .image-item {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
    border: 1px solid var(--border);
  }

  .image-container {
    position: relative;
    width: 100%;
    padding-bottom: 100%;
    overflow: hidden;

    img {
      @include fill-parent;
      position: absolute;
      object-fit: cover;
      top: 0;
      left: 0;
    }

    .remove-button {
      @include flex-center;
      position: absolute;
      top: var(--spacing-3);
      right: var(--spacing-3);
      width: 1.75rem;
      height: 1.75rem;
      background-color: rgba(0, 0, 0, 0.5);
      color: #fff;
      border-radius: 50%;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      z-index: 2;

      svg {
        width: 1rem;
        height: 1rem;
      }
    }

    &:hover .remove-button {
      opacity: 1;
    }
  }

  .image-info {
    padding: var(--spacing-3);

    .file-name {
      font-weight: var(--font-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.25rem;
    }

    .file-size {
      @include text("sm");
      color: var(--muted-foreground);
    }
  }
}
</style>
