<script setup lang="ts">
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

import type { LayoutAction } from "#src/composables/useDashboardLayout"
import type { CachedCollection } from "#src/stores/collections"

import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDialog } from "#src/composables/useDialog"
import { useRangeSelect } from "#src/composables/useRangeSelect"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"

const router = useRouter()
const { reset, setHeader, setSelection } = useDashboardLayout()
const { show: showDialog } = useDialog()
const { show: showToast } = useToast()
const collectionsStore = useCollectionsStore()
const { collections } = storeToRefs(collectionsStore)

const selectedCollectionsIds = ref<string[]>([])
const { clearLastSelected, handleSelect: handleSelectCollection } = useRangeSelect(
  collections,
  selectedCollectionsIds
)

const handleNewCollection = () => {
  router.push("/dashboard/collections/new")
}

const handleEditCollection = (collectionOrId: CachedCollection | string) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  router.push(`/dashboard/collections/${collectionId}/edit`)
}

const handleSelectCollectionImages = (collectionOrId: CachedCollection | string) => {
  const collectionId = typeof collectionOrId === "object" ? collectionOrId.id : collectionOrId
  router.push(`/dashboard/collections/${collectionId}/images`)
}

const handleDeleteCollection = (collectionOrId: CachedCollection | string) => {
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

const handleBulkDeleteCollections = (collectionIds: string[]) => {
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

const clearSelection = () => {
  selectedCollectionsIds.value = []
  clearLastSelected()
  setSelection({ items: 0 })
}

const cancelSelectionAction: LayoutAction = {
  color: "secondary",
  icon: "X",
  key: "selection-cancel",
  onClick: () => clearSelection(),
  text: "Cancel"
}

const bulkDeleteCollectionsAction: LayoutAction = {
  icon: "Trash",
  key: "collection-delete-bulk",
  onClick: () => handleBulkDeleteCollections(selectedCollectionsIds.value),
  text: "Delete"
}

const downloadCollectionsAction: LayoutAction = {
  icon: "Download",
  key: "collection-download",
  onClick: () => collectionsStore.bulkDownload(selectedCollectionsIds.value),
  text: "Download"
}

const editCollectionAction: LayoutAction = {
  icon: "Pencil",
  key: "collection-edit-single",
  onClick: () => handleEditCollection(selectedCollectionsIds.value[0]),
  text: "Edit"
}

const selectCollectionImagesAction: LayoutAction = {
  icon: "Grid",
  key: "collection-select-images",
  onClick: () => handleSelectCollectionImages(selectedCollectionsIds.value[0]),
  text: "Select Images"
}

watch(
  selectedCollectionsIds,
  (ids: string[]) => {
    if (ids.length === 1) {
      setSelection({
        actions: [
          bulkDeleteCollectionsAction,
          downloadCollectionsAction,
          editCollectionAction,
          selectCollectionImagesAction,
          cancelSelectionAction
        ],
        items: ids.length
      })
    } else {
      setSelection({
        actions: [bulkDeleteCollectionsAction, downloadCollectionsAction, cancelSelectionAction],
        items: ids.length
      })
    }
  },
  { deep: true }
)

onMounted(() => {
  setHeader({
    actions: [
      {
        icon: "Plus",
        onClick: () => handleNewCollection(),
        text: "New Collection"
      }
    ],
    title: "Collections"
  })
})

onUnmounted(reset)
</script>

<template>
  <div class="collections-view">
    <CollectionGrid
      v-if="collections.length"
      :collections="collections"
      :short-grid="false"
      :selected-collections-ids="selectedCollectionsIds"
      :fast-select="false"
      :show-actions="false"
      :allow-select="true"
      @select="handleSelectCollection"
      @edit="handleEditCollection"
      @delete="handleDeleteCollection"
    />
    <div v-else class="dashboard-empty">
      <h5>No collections yet</h5>
    </div>
  </div>
</template>

<style lang="scss"></style>
