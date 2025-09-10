<script setup>
import { getThumbnailPath } from "#src/utils/helpers"
import { useTemplateRef } from "vue"

defineProps({
  collection: {
    required: true,
    type: Object
  },
  currentImageId: {
    default: null,
    type: String
  }
})

const collectionImages = useTemplateRef("collection-images")
defineExpose({ collectionImages })
</script>

<template>
  <div ref="collection-images" class="collection-images">
    <div
      v-for="image in collection?.images"
      :key="image.id"
      class="thumbnail-item"
      :class="{ active: image.id === currentImageId }"
    >
      <img :src="getThumbnailPath(image)" loading="lazy" />
    </div>
  </div>
</template>

<style lang="scss">
.collection-images {
  @include hide-scrollbar;
  background: var(--background);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow-x: auto;
  display: flex;
  flex-direction: row;
  gap: var(--spacing-3);
}

.thumbnail-item {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
