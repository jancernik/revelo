<script setup>
import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"

const { resetHeader, setHeader, setSelection } = useDashboardLayout()
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
  window.alert(`NOT IMPLEMENTED: edit single collection\n${collectionId}`)
}

const handleSelectCollectionImages = (collectionOrId) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  window.alert(`NOT IMPLEMENTED: select collection images\n${collectionId}`)
}

const handleDeleteCollection = (collectionOrId) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  window.alert(`NOT IMPLEMENTED: delete single collection\n${collectionId}`)
}

const handleBulkDeleteCollections = (collectionIds) => {
  window.alert(`NOT IMPLEMENTED: delete multiple collections\n${collectionIds.join("\n")}`)
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
  window.alert(`NOT IMPLEMENTED: edit single image\n${imageId}`)
}

const handleBulkEditImages = (imageIds) => {
  window.alert(`NOT IMPLEMENTED: edit multiple images\n${imageIds.join("\n")}`)
}

const handleAddImagesToCollection = (imageIds) => {
  window.alert(`NOT IMPLEMENTED: add images to collection\n${imageIds.join("\n")}`)
}

const handleDeleteImage = (imageOrId) => {
  const imageId = typeof imageOrId === "object" ? imageOrId.id : imageOrId
  window.alert(`NOT IMPLEMENTED: delete single image\n${imageId}`)
}

const handleBulkDeleteImages = (imageIds) => {
  window.alert(`NOT IMPLEMENTED: delete multiple images\n${imageIds.join("\n")}`)
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
  },
  {
    icon: "Plus",
    key: "image-add-to-collection",
    onClick: () => handleAddImagesToCollection(selectedImagesIds.value),
    text: "Add to collection"
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
onUnmounted(resetHeader)
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-section stats">
      <div class="images">
        <p>Images</p>
        <h4>{{ images.length }}</h4>
      </div>
      <div class="collections">
        <p>Collections</p>
        <h4>{{ collections.length }}</h4>
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
        width: 100%;
      }
    }
  }

  @include flex(column, stretch, flex-start);
  gap: var(--spacing-10);

  > * {
    &:not(:first-child) {
      border-top: 1px solid var(--border);
      padding-top: var(--spacing-10);
    }
  }

  @include breakpoint("md") {
    gap: var(--spacing-6);

    > * {
      &:not(:first-child) {
        padding-top: var(--spacing-6);
      }
    }
  }
}
</style>
