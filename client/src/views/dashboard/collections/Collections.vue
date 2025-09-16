<script setup>
import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const { resetHeader, setHeader, setSelection } = useDashboardLayout()
const collectionsStore = useCollectionsStore()
const { collections } = storeToRefs(collectionsStore)

const selectedCollectionsIds = ref([])

const handleNewCollection = () => {
  router.push("/dashboard/collections/new")
}

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

const clearSelection = () => {
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

onUnmounted(resetHeader)
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
