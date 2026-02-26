<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useRangeSelect } from "#src/composables/useRangeSelect"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
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
const { images } = storeToRefs(imagesStore)

const collection = ref(null)
const loading = ref(true)
const saving = ref(false)
const selectedImagesIds = ref([])

const availableImages = computed(() => {
  return images.value?.filter((i) => !i.collectionId || i.collectionId === props.id) || []
})

const { handleSelect: handleSelectImage } = useRangeSelect(availableImages, selectedImagesIds)

const loadCollection = async () => {
  try {
    loading.value = true
    collection.value = await collectionsStore.fetch(props.id)
    selectedImagesIds.value = await collectionsStore.getImageIdsInCollection(collection.value)
  } finally {
    loading.value = false
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

onUnmounted(reset)
</script>

<template>
  <div v-if="collection" class="select-collection-images">
    <div v-if="availableImages.length">
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
      <h5>No images available</h5>
    </div>
  </div>
</template>

<style lang="scss"></style>
