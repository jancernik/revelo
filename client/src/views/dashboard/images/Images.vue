<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDialog } from "#src/composables/useDialog"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const { reset, setHeader, setSelection } = useDashboardLayout()
const { show: showDialog } = useDialog()
const { show: showToast } = useToast()
const imagesStore = useImagesStore()
const { images } = storeToRefs(imagesStore)

const selectedImagesIds = ref([])

const handleUploadImages = () => {
  router.push("/dashboard/images/upload")
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

onMounted(() => {
  setHeader({
    actions: [
      {
        icon: "Upload",
        onClick: () => handleUploadImages(),
        text: "Upload"
      }
    ],
    title: "Images"
  })
})

onUnmounted(reset)
</script>

<template>
  <div class="images-view">
    <ImageGrid
      v-if="images.length"
      :images="images"
      :short-grid="false"
      :selected-images-ids="selectedImagesIds"
      :fast-select="false"
      :show-actions="false"
      :allow-select="true"
      @select="handleSelectImage"
      @edit="handleEditImage"
      @delete="handleDeleteImage"
    />
    <div v-else class="dashboard-empty">
      <h5>No images yet</h5>
    </div>
  </div>
</template>

<style lang="scss"></style>
