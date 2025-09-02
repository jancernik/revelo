<script setup>
import Icon from "#src/components/common/Icon.vue"
import { getThumbnailPath } from "#src/utils/helpers"
import { computed } from "vue"

const props = defineProps({
  fastSelect: {
    default: false,
    type: Boolean
  },
  images: {
    required: true,
    type: Array
  },
  selectedImagesIds: {
    default: () => [],
    type: Array
  },
  shortGrid: {
    default: false,
    type: Boolean
  },
  showImageActions: {
    default: false,
    type: Boolean
  }
})

const emit = defineEmits(["select", "edit", "delete"])

const displayedImages = computed(() => {
  return props.shortGrid ? props.images.slice(0, 5) : props.images
})

const isSelected = (image) => props.selectedImagesIds?.includes(image.id)
const isSelecting = computed(() => props.selectedImagesIds?.length > 0 || props.fastSelect)
</script>

<template>
  <div class="dashboard-image-grid" :class="{ 'is-selecting': isSelecting }">
    <div
      v-for="(image, imageIndex) in displayedImages"
      :key="imageIndex"
      class="image-item"
      :class="{ selected: isSelected(image) }"
    >
      <div class="image-container" @click="isSelecting && emit('select', image)">
        <img :src="getThumbnailPath(image)" :alt="image.caption" loading="lazy" />
      </div>
      <button class="select-button" @click="emit('select', image)">
        <Icon name="Check" size="12" stroke-width="4" />
      </button>
      <div v-if="showImageActions && !fastSelect && !isSelecting" class="image-actions">
        <button class="action-button" @click="emit('edit', image)"><Icon name="Pencil" /></button>
        <button class="action-button" @click="emit('delete', image)"><Icon name="Trash" /></button>
      </div>
    </div>
    <router-link v-if="shortGrid" to="/dashboard/images">View all</router-link>
  </div>
</template>

<style lang="scss">
.dashboard-image-grid {
  $transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  display: grid;
  gap: var(--spacing-4);

  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

  @include breakpoint("sm") {
    grid-template-columns: repeat(2, 1fr);
  }

  @include breakpoint("md") {
    grid-template-columns: repeat(3, 1fr);
  }

  @include breakpoint("lg") {
    grid-template-columns: repeat(4, 1fr);
  }

  @include breakpoint("xl") {
    grid-template-columns: repeat(5, 1fr);
  }

  @include breakpoint("2xl") {
    grid-template-columns: repeat(6, 1fr);
  }

  .image-item,
  > a {
    position: relative;
    aspect-ratio: 1;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--muted);
    cursor: pointer;

    &:hover {
      .image-actions {
        opacity: 1;
      }
      .select-button {
        opacity: 0.5;
      }
      &:has(.image-actions) .image-container::after {
        opacity: 1;
      }
    }

    &.selected {
      outline: 2px solid var(--primary);
      outline-offset: 2px;

      .select-button {
        background-color: var(--primary);
        border: 2px solid var(--background);
        outline: 2px solid var(--primary);
        opacity: 1;
        .icon {
          color: var(--background);
        }
      }
    }
  }

  &.is-selecting .select-button {
    opacity: 0.5;
  }

  .image-container {
    @include fill-parent;
    &::after {
      content: "";
      width: 100%;
      height: 50%;
      position: absolute;
      bottom: 0;
      left: 0;
      opacity: 0;
      transition: opacity $transition;
      pointer-events: none;
      @include light-dark-property(
        background,
        linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent),
        linear-gradient(to top, rgba(255, 255, 255, 0.3), transparent)
      );
    }
    img {
      @include fill-parent;
      object-fit: cover;
      pointer-events: none;
      user-select: none;
    }
  }

  .select-button {
    @include flex-center;
    position: absolute;
    top: var(--spacing-3);
    left: var(--spacing-3);
    width: calc(1.5rem - 2px);
    height: calc(1.5rem - 2px);
    background-color: var(--background);
    color: var(--primary-foreground);
    border-radius: 50%;
    border: 2px solid var(--muted-foreground);
    outline: 2px solid var(--background);
    transition: opacity $transition;
    cursor: pointer;
    opacity: 0;

    .icon {
      @include flex-center;
      color: var(--muted-foreground);
    }

    &:active {
      transform: scale(0.95);
    }

    &:hover {
      opacity: 1 !important;
    }
  }

  .image-actions {
    position: absolute;
    bottom: var(--spacing-4);
    right: var(--spacing-4);
    @include flex(row, flex-end, center);
    gap: var(--spacing-2);
    opacity: 0;
    transform: translateY(4px);
    transition: all $transition;

    .action-button {
      @include flex-center;
      width: 1.8rem;
      height: 1.8rem;
      cursor: pointer;
      transition: $transition;
      background-color: transparent;
      border: none;
      color: var(--muted);

      &:hover {
        color: var(--background);
      }
    }
  }

  > a {
    @include flex-center;
    @include text("sm");
    background-color: var(--secondary);
    border: 1px solid var(--border);
    color: var(--foreground);
    text-decoration: none;
    font-weight: var(--font-medium);

    &:hover {
      background-color: var(--secondary-hover);
    }
  }
}
</style>
