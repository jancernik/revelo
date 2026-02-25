<script setup>
import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDialog } from "#src/composables/useDialog"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const commitHash = import.meta.env.VITE_COMMIT_HASH || "dev"
const router = useRouter()
const { reset, setHeader, setSelection } = useDashboardLayout()
const { show: showDialog } = useDialog()
const { show: showToast } = useToast()
const imagesStore = useImagesStore()
const { images } = storeToRefs(imagesStore)
const collectionsStore = useCollectionsStore()
const { collections } = storeToRefs(collectionsStore)

const selectedImagesIds = ref([])
const selectedCollectionsIds = ref([])

const handleSelectCollection = (collection) => {
  if (selectedCollectionsIds.value.includes(collection.id)) {
    selectedCollectionsIds.value = selectedCollectionsIds.value.filter((id) => id !== collection.id)
  } else {
    selectedCollectionsIds.value.push(collection.id)
  }
}

const handleEditCollection = (collectionOrId) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  router.push(`/dashboard/collections/${collectionId}/edit`)
}

const handleSelectCollectionImages = (collectionOrId) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  router.push(`/dashboard/collections/${collectionId}/images`)
}

const handleDeleteCollection = (collectionOrId) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  showDialog({
    actions: [
      {
        callback: async () => {
          try {
            await collectionsStore.remove(collectionId)
            showToast({
              description: "Collection deleted.",
              title: "Collection Deleted",
              type: "success"
            })
            clearSelection()
          } catch {
            // error handled by store
          }
        },
        name: "Delete"
      }
    ],
    description: "This action cannot be undone.",
    title: "Delete Collection"
  })
}

const handleBulkDeleteCollections = (collectionIds) => {
  showDialog({
    actions: [
      {
        callback: async () => {
          try {
            await collectionsStore.bulkRemove(collectionIds)
            showToast({
              description: `Deleted ${collectionIds.length} collection${collectionIds.length !== 1 ? "s" : ""}.`,
              title: "Collections Deleted",
              type: "success"
            })
            clearSelection()
          } catch {
            // error handled by store
          }
        },
        name: "Delete"
      }
    ],
    description: `Delete ${collectionIds.length} collection${collectionIds.length !== 1 ? "s" : ""}? This action cannot be undone.`,
    title: "Delete Collections"
  })
}

const handleSelectImage = (image) => {
  if (selectedImagesIds.value.includes(image.id)) {
    selectedImagesIds.value = selectedImagesIds.value.filter((id) => id !== image.id)
  } else {
    selectedImagesIds.value.push(image.id)
  }
}

const handleEditImage = (imageOrId) => {
  const imageId = typeof imageOrId === "object" ? imageOrId.id : imageOrId
  router.push(`/dashboard/images/${imageId}/edit`)
}

const handleBulkEditImages = (imageIds) => {
  router.push({ name: "images-edit", query: { ids: imageIds.join(",") } })
}

const handleDeleteImage = (imageOrId) => {
  const imageId = typeof imageOrId === "object" ? imageOrId.id : imageOrId
  showDialog({
    actions: [
      {
        callback: async () => {
          try {
            await imagesStore.remove(imageId)
            showToast({ description: "Image deleted.", title: "Image Deleted", type: "success" })
          } catch {
            // error handled by store
          }
        },
        name: "Delete"
      }
    ],
    description: "This action cannot be undone.",
    title: "Delete Image"
  })
}

const handleBulkDeleteImages = (imageIds) => {
  showDialog({
    actions: [
      {
        callback: async () => {
          try {
            await imagesStore.bulkRemove(imageIds)
            showToast({
              description: `Deleted ${imageIds.length} image${imageIds.length !== 1 ? "s" : ""}.`,
              title: "Images Deleted",
              type: "success"
            })
            clearSelection()
          } catch {
            // error handled by store
          }
        },
        name: "Delete"
      }
    ],
    description: `Delete ${imageIds.length} image${imageIds.length !== 1 ? "s" : ""}? This action cannot be undone.`,
    title: "Delete Images"
  })
}

const clearSelection = () => {
  selectedImagesIds.value = []
  selectedCollectionsIds.value = []
  setSelection({ items: 0 })
}

const cancelSelectionAction = {
  color: "secondary",
  icon: "X",
  key: "selection-cancel",
  onClick: () => clearSelection(),
  text: "Cancel"
}

const editImageAction = {
  icon: "Pencil",
  key: "image-edit-single",
  onClick: () => handleEditImage(selectedImagesIds.value[0]),
  text: "Edit"
}

const bulkEditImagesAction = {
  icon: "Pencil",
  key: "image-edit-bulk",
  onClick: () => handleBulkEditImages(selectedImagesIds.value),
  text: "Edit"
}

const baseImageActions = [
  {
    icon: "Trash",
    key: "image-delete-bulk",
    onClick: () => handleBulkDeleteImages(selectedImagesIds.value),
    text: "Delete"
  }
]

const bulkDeleteCollectionsAction = {
  icon: "Trash",
  key: "collection-delete-bulk",
  onClick: () => handleBulkDeleteCollections(selectedCollectionsIds.value),
  text: "Delete"
}

const editCollectionAction = {
  icon: "Pencil",
  key: "collection-edit-single",
  onClick: () => handleEditCollection(selectedCollectionsIds.value[0]),
  text: "Edit"
}

const selectCollectionImagesAction = {
  icon: "Grid",
  key: "collection-select-images",
  onClick: () => handleSelectCollectionImages(selectedCollectionsIds.value[0]),
  text: "Select Images"
}

watch(
  selectedImagesIds,
  (ids) => {
    setSelection({
      actions: [
        ...baseImageActions,
        ids.length === 1 ? editImageAction : bulkEditImagesAction,
        cancelSelectionAction
      ],
      items: ids.length
    })
  },
  { deep: true }
)

watch(
  selectedCollectionsIds,
  (ids) => {
    if (ids.length === 1) {
      setSelection({
        actions: [
          bulkDeleteCollectionsAction,
          editCollectionAction,
          selectCollectionImagesAction,
          cancelSelectionAction
        ],
        items: ids.length
      })
    } else {
      setSelection({
        actions: [bulkDeleteCollectionsAction, cancelSelectionAction],
        items: ids.length
      })
    }
  },
  { deep: true }
)

onMounted(() => setHeader({ title: "Dashboard" }))
onUnmounted(reset)
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-section stats">
      <div class="images">
        <p>Total Images</p>
        <h4>{{ images.length }}</h4>
      </div>
      <div class="standalone-images">
        <p>Standalone images</p>
        <h4>{{ images.filter((i) => !i.collectionId).length }}</h4>
      </div>
      <div class="collections">
        <p>Collections</p>
        <h4>{{ collections.length }}</h4>
      </div>
      <div class="version">
        <p>Version</p>
        <h4>{{ commitHash.slice(0, 7) }}</h4>
      </div>
    </div>
    <div class="dashboard-section">
      <h3>Images</h3>
      <ImageGrid
        v-if="images.length"
        :images="images"
        :short-grid="true"
        :selected-images-ids="selectedImagesIds"
        :fast-select="false"
        :show-actions="false"
        :allow-select="selectedCollectionsIds.length === 0"
        @select="handleSelectImage"
        @edit="handleEditImage"
        @delete="handleDeleteImage"
      />
    </div>
    <div class="dashboard-section">
      <h3>Collections</h3>
      <CollectionGrid
        v-if="collections.length"
        :collections="collections"
        :short-grid="true"
        :selected-collections-ids="selectedCollectionsIds"
        :fast-select="false"
        :show-actions="false"
        :allow-select="selectedImagesIds.length === 0"
        @select="handleSelectCollection"
        @edit="handleEditCollection"
        @delete="handleDeleteCollection"
      />
    </div>
  </div>
</template>

<style lang="scss">
.dashboard {
  .dashboard-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);

    &.stats {
      flex-direction: row;
      flex-wrap: wrap;
      > div {
        p {
          color: var(--muted-foreground);
          text-transform: uppercase;
          @include text("sm");
        }

        display: flex;
        flex-direction: column;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        color: var(--foreground);
        background-color: var(--secondary);
        gap: var(--spacing-1);
        padding: var(--spacing-4);
        flex: 1 0 calc(50% - var(--spacing-2));

        @include breakpoint("md") {
          flex: 1;
        }
      }
    }
  }

  @include flex(column, stretch, flex-start);
  gap: var(--spacing-6);

  > * {
    &:not(:first-child) {
      border-top: 1px solid var(--border);
      padding-top: var(--spacing-6);
    }
  }

  @include breakpoint("lg") {
    gap: var(--spacing-10);

    > * {
      &:not(:first-child) {
        padding-top: var(--spacing-10);
      }
    }
  }
}
</style>
