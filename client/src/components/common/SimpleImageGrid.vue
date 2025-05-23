<script setup>
import RIcon from '@/components/RIcon.vue'
const emit = defineEmits(['remove'])

defineProps({
  images: {
    type: Array,
    required: true
  },
  showFileNames: {
    type: Boolean,
    default: false
  },
  showFileSizes: {
    type: Boolean,
    default: false
  },
  allowDelete: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="image-grid">
    <div v-for="(image, index) in images" :key="index" class="image-item">
      <div class="image-container">
        <img :src="image.src" :alt="image.name" />
        <div v-if="allowDelete" class="remove-button" @click="() => emit('remove', index)">
          <RIcon name="X" />
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

<style lang="scss" scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  width: 100%;
  gap: $md-spacing * 2;
}

.image-item {
  display: flex;
  flex-direction: column;
  border-radius: 0.375rem;
  overflow: hidden;
  position: relative;
  border: 1px solid #e4e4e4;
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
    top: $md-spacing;
    right: $md-spacing;
    width: 1.75rem;
    height: 1.75rem;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
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
  padding: 0.75rem;

  .file-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.25rem;
  }

  .file-size {
    font-size: 0.85em;
    color: #666;
  }
}
</style>
