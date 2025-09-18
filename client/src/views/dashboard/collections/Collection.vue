<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDialog } from "#src/composables/useDialog"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const props = defineProps({
  id: {
    required: true,
    type: String
  }
})

const router = useRouter()
const { resetHeader, setHeader, setSelection } = useDashboardLayout()
const { show: showDialog } = useDialog()
const { show: showToast } = useToast()
const collectionsStore = useCollectionsStore()

const selectedImagesIds = ref([])
const collection = ref(null)
const loading = ref(true)

const handleSelectImage = (image) => {
  if (selectedImagesIds.value.includes(image.id)) {
    selectedImagesIds.value = selectedImagesIds.value.filter((id) => id !== image.id)
  } else {
    selectedImagesIds.value.push(image.id)
  }
}

const clearSelection = () => {
  selectedImagesIds.value = []
  setSelection({ items: 0 })
}

const loadCollection = async () => {
  try {
    loading.value = true
    collection.value = await collectionsStore.fetch(props.id)
  } finally {
    loading.value = false
  }
}

const handleDelete = () => {
  showDialog({
    actions: [
      {
        callback: async () => {
          try {
            await collectionsStore.remove(props.id)
            router.push("/dashboard/collections")
            showToast({
              description: "The collection has been deleted successfully.",
              title: "Collection Deleted",
              type: "success"
            })
          } catch (error) {
            showToast({
              description: error.message || "Failed to delete collection.",
              title: "Delete Failed",
              type: "error"
            })
          }
        },
        icon: "Trash",
        name: "Delete"
      }
    ],
    description: `Are you sure you want to delete the collection${collection.value?.title ? ` "${collection.value.title}"` : ""}?`,
    title: "Delete Collection"
  })
}

const setupLayout = () => {
  setHeader({
    actions: [
      {
        icon: "Pencil",
        key: "edit",
        onClick: () => router.push(`/dashboard/collections/${props.id}/edit`),
        text: "Edit"
      },
      {
        icon: "Grid",
        key: "select-images",
        onClick: () => router.push(`/dashboard/collections/${props.id}/images`),
        text: "Select Images"
      },
      {
        icon: "Trash",
        key: "delete",
        onClick: handleDelete,
        text: "Delete"
      }
    ],
    title: collection.value?.title || "Collection"
  })
}

const cancelSelectionAction = {
  color: "secondary",
  icon: "X",
  key: "selection-cancel",
  onClick: () => clearSelection(),
  text: "Cancel"
}

const removeImagesFromCollectionAction = {
  icon: "Trash",
  key: "selection-remove",
  onClick: () => {
    collectionsStore.removeImages(props.id, selectedImagesIds.value)
    collection.value.images = collection.value.images.filter(
      (img) => !selectedImagesIds.value.includes(img.id)
    )
    clearSelection()
  },
  text: "Remove from collection"
}

watch(
  selectedImagesIds,
  (ids) => {
    setSelection({
      actions: [removeImagesFromCollectionAction, cancelSelectionAction],
      items: ids.length
    })
  },
  { deep: true }
)

onMounted(async () => {
  await loadCollection()
  setupLayout()
})

onUnmounted(resetHeader)
</script>

<template>
  <div v-if="collection" class="collection-view">
    <ImageGrid
      v-if="collection.images?.length"
      :images="collection.images"
      :allow-select="true"
      :show-actions="false"
      :selected-images-ids="selectedImagesIds"
      @select="handleSelectImage"
    />

    <div v-else class="empty-state">
      <h5>No Images in this collection yet</h5>
    </div>
  </div>
</template>

<style lang="scss"></style>
