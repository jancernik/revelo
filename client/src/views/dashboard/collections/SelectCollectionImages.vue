<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"

const props = defineProps({
  id: {
    required: true,
    type: String
  }
})

const { show: showToast } = useToast()
const router = useRouter()
const { reset, setFooter, setHeader } = useDashboardLayout()
const collectionsStore = useCollectionsStore()
const imagesStore = useImagesStore()

const collection = ref(null)
const loading = ref(true)
const saving = ref(false)
const selectedImagesIds = ref([])
const lastSelectedId = ref(null)

const availableImages = computed(() => {
  const allImages = imagesStore.images || []
  return allImages.filter((i) => !i.collectionId || i.collectionId === props.id)
})

const loadCollection = async () => {
  try {
    loading.value = true
    collection.value = await collectionsStore.fetch(props.id)
    selectedImagesIds.value = collection.value.images
      .sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0))
      .map((img) => img.id)
  } finally {
    loading.value = false
  }
}

const handleSelectImage = (image, event) => {
  if (event?.shiftKey && lastSelectedId.value) {
    const startIndex = availableImages.value.findIndex((i) => i.id === lastSelectedId.value)
    const endIndex = availableImages.value.findIndex((i) => i.id === image.id)

    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex)
      const end = Math.max(startIndex, endIndex)
      const rangeImages = availableImages.value.slice(start, end + 1)
      handleSelectRange(rangeImages)
      return
    }
  }

  lastSelectedId.value = image.id
  if (selectedImagesIds.value.includes(image.id)) {
    selectedImagesIds.value = selectedImagesIds.value.filter((id) => id !== image.id)
  } else {
    selectedImagesIds.value.push(image.id)
  }
}

const handleSelectRange = (images) => {
  const imageIds = images.map((i) => i.id)
  const allSelected = imageIds.every((id) => selectedImagesIds.value.includes(id))

  if (allSelected) {
    selectedImagesIds.value = selectedImagesIds.value.filter((id) => !imageIds.includes(id))
  } else {
    imageIds.forEach((id) => {
      if (!selectedImagesIds.value.includes(id)) {
        selectedImagesIds.value.push(id)
      }
    })
  }
}

const saveCollection = async () => {
  try {
    saving.value = true
    await collectionsStore.setImages(props.id, selectedImagesIds.value)
    router.push(`/dashboard/collections/${props.id}`)
    showToast({
      description: `Collection updated successfully.`,
      title: "Collection Updated",
      type: "success"
    })
  } finally {
    saving.value = false
  }
}

const cancel = () => {
  router.push(`/dashboard/collections/${props.id}`)
}

const setupLayout = () => {
  setHeader({
    title: "Select collection images"
  })

  setFooter({
    actions: [
      {
        color: "secondary",
        icon: "X",
        key: "cancel",
        onClick: () => cancel(),
        text: "Cancel"
      },
      {
        color: "primary",
        icon: "Save",
        key: "save",
        onClick: () => saveCollection(),
        text: "Save Changes"
      }
    ]
  })
}

onMounted(async () => {
  await loadCollection()
  setupLayout()
})

onUnmounted(() => {
  reset()
})
</script>

<template>
  <div v-if="collection" class="select-collection-images">
    <div class="images-section">
      <div v-if="availableImages">
        <ImageGrid
          :images="availableImages"
          :selected-images-ids="selectedImagesIds"
          :allow-select="true"
          :fast-select="true"
          :show-actions="false"
          @select="handleSelectImage"
        />
      </div>

      <div v-else class="empty-state">
        <h5>No Images Available</h5>
        <p>Upload some images first to add them to collections.</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
