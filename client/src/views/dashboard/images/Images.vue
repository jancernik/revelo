<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const { resetHeader, setHeader, setSelection } = useDashboardLayout()
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

onUnmounted(resetHeader)
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
