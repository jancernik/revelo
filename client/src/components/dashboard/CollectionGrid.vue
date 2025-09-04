<script setup>
import Icon from "#src/components/common/Icon.vue"
import { getThumbnailPath } from "#src/utils/helpers"
import { computed } from "vue"
import { useRouter } from "vue-router"

const props = defineProps({
  allowSelect: {
    default: true,
    type: Boolean
  },
  collections: {
    required: true,
    type: Array
  },
  fastSelect: {
    default: false,
    type: Boolean
  },
  selectedCollectionsIds: {
    default: () => [],
    type: Array
  },
  shortGrid: {
    default: false,
    type: Boolean
  },
  showActions: {
    default: false,
    type: Boolean
  }
})

const router = useRouter()
const emit = defineEmits(["select", "edit", "delete"])

const displayedCollections = computed(() => {
  return props.shortGrid ? props.collections.slice(0, 3) : props.collections
})

const previewImagesPaths = (collection) => {
  return collection.images.slice(0, 4).map((image) => getThumbnailPath(image.image))
}

const isSelected = (collection) => props.selectedCollectionsIds?.includes(collection.id)
const isSelecting = computed(() => {
  return (props.allowSelect && props.selectedCollectionsIds?.length > 0) || props.fastSelect
})
const onlyOneImage = (collection) => collection.images.length === 1

const openCollection = (collection) => {
  router.push(`/dashboard/collections/${collection.id}`)
}
</script>

<template>
  <div class="dashboard-collection-grid" :class="{ 'is-selecting': isSelecting }">
    <div
      v-for="(collection, collectionIndex) in displayedCollections"
      :key="collectionIndex"
      class="collection-item"
      :class="{ selected: allowSelect && isSelected(collection) }"
    >
      <div
        class="collection-container"
        @click="isSelecting ? emit('select', collection) : openCollection(collection)"
      >
        <div class="preview">
          <img
            v-for="(path, imageIndex) in previewImagesPaths(collection)"
            :key="imageIndex"
            :src="path"
            loading="lazy"
          />
        </div>
        <div class="text">
          <p class="title" :class="{ 'no-title': !collection.title }">
            {{ collection.title ? collection.title : "Untitled" }}
          </p>
          <p v-if="onlyOneImage(collection)" class="image-count">1 image</p>
          <p v-else class="image-count">{{ collection.images.length }} images</p>
        </div>
      </div>
      <button v-if="allowSelect" class="select-button" @click="emit('select', collection)">
        <Icon name="Check" size="12" :stroke-width="4" />
      </button>
      <div v-if="showActions && !fastSelect && !isSelecting" class="collection-actions">
        <button class="action-button" @click="emit('edit', collection)">
          <Icon name="Pencil" />
        </button>
        <button class="action-button" @click="emit('delete', collection)">
          <Icon name="Trash" />
        </button>
      </div>
    </div>
    <RouterLink v-if="shortGrid" to="/dashboard/collections">View all</RouterLink>
  </div>
</template>

<style lang="scss">
.dashboard-collection-grid {
  $transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  display: grid;
  gap: var(--spacing-4);

  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

  @include breakpoint("sm") {
    grid-template-columns: repeat(1, 1fr);
  }

  @include breakpoint("md") {
    grid-template-columns: repeat(2, 1fr);
  }

  @include breakpoint("lg") {
    grid-template-columns: repeat(3, 1fr);
  }

  @include breakpoint("xl") {
    grid-template-columns: repeat(4, 1fr);
  }

  .collection-item,
  > a {
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--muted);
    cursor: pointer;

    &:hover {
      .collection-actions {
        opacity: 1;
      }
      .select-button {
        opacity: 0.5;
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

  .collection-container {
    @include fill-parent;
    position: relative;

    &::after {
      content: "";
      width: 100%;
      height: 50%;
      position: absolute;
      bottom: 0;
      left: 0;
      transition: opacity $transition;
      pointer-events: none;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
    }

    .preview {
      @include fill-parent;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);

      img {
        @include fill-parent;
        object-fit: cover;
        pointer-events: none;
        user-select: none;
        background-color: var(--muted);

        &:nth-child(1) {
          border-top-left-radius: calc(var(--radius-lg) - 1px);
        }

        &:nth-child(2) {
          border-top-right-radius: calc(var(--radius-lg) - 1px);
        }

        &:nth-child(3) {
          border-bottom-left-radius: calc(var(--radius-lg) - 1px);
        }

        &:nth-child(4) {
          border-bottom-right-radius: calc(var(--radius-lg) - 1px);
        }

        &:only-child {
          grid-column: 1 / -1;
          grid-row: 1 / -1;
          border-radius: calc(var(--radius-lg) - 1px);
        }

        &:nth-child(2):last-child {
          grid-column: 2;
          grid-row: 1 / -1;
        }

        &:nth-child(1):nth-last-child(2) {
          grid-column: 1;
          grid-row: 1 / -1;
        }

        &:nth-child(3):last-child {
          grid-column: 1 / -1;
          grid-row: 2;
        }
      }
    }

    .text {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      color: #ffffff;
      padding: var(--spacing-4) var(--spacing-4) var(--spacing-3);
      transition: $transition;
      z-index: 10;

      .title {
        @include text("base");
        font-weight: var(--font-semibold);
        margin: 0;
        margin-bottom: var(--spacing-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        &.no-title {
          font-style: italic;
          opacity: 0.7;
        }
      }

      p {
        @include text("xs");
        font-weight: var(--font-medium);
        margin: 0;
        opacity: 0.9;
      }
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

  .collection-actions {
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
      color: #e0e0e0;

      &:hover {
        color: #ffffff;
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
