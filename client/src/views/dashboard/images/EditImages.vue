<script setup>
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"
import { storeToRefs } from "pinia"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const { show: showToast } = useToast()
const route = useRoute()
const router = useRouter()
const { reset, setFooter, setHeader } = useDashboardLayout()
const imagesStore = useImagesStore()
const { images } = storeToRefs(imagesStore)

const imageIds = computed(() => {
  const ids = route.query.ids
  if (!ids) return []
  return Array.isArray(ids) ? ids : ids.split(",").filter(Boolean)
})

onMounted(() => {
  if (imageIds.value.length === 0) {
    router.replace("/dashboard/images")
  } else if (imageIds.value.length === 1) {
    router.replace(`/dashboard/images/${imageIds.value[0]}/edit`)
  }
})

const selectedImages = computed(() => images.value.filter((img) => imageIds.value.includes(img.id)))

const EMPTY_METADATA = {
  aperture: "",
  camera: "",
  comment: "",
  date: "",
  focalLength: "",
  focalLengthEquivalent: "",
  iso: "",
  lens: "",
  shutterSpeed: ""
}

const saving = ref(false)
const metadata = ref({})

const hasChanges = computed(() => Object.values(metadata.value).some((v) => v !== ""))

const handleMetadataUpdate = (newMetadata) => {
  metadata.value = newMetadata
}

const handleSave = async () => {
  const payload = {}
  for (const [key, value] of Object.entries(metadata.value)) {
    if (value !== "" && value !== null) payload[key] = value
  }

  if (Object.keys(payload).length === 0) return

  try {
    saving.value = true
    await imagesStore.bulkUpdateMetadata(imageIds.value, payload)

    router.push("/dashboard/images")
    showToast({
      description: `Updated metadata for ${imageIds.value.length} image${imageIds.value.length !== 1 ? "s" : ""}.`,
      title: "Images Updated",
      type: "success"
    })
  } catch (error) {
    showToast({
      description: error.message || "Failed to update image metadata.",
      title: "Update Failed",
      type: "error"
    })
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push("/dashboard/images")
}

const setupLayout = () => {
  setHeader({
    title: `Edit ${imageIds.value.length} Image${imageIds.value.length !== 1 ? "s" : ""}`
  })

  setFooter({
    actions: [
      {
        color: "secondary",
        icon: "X",
        key: "cancel",
        onClick: handleCancel,
        text: "Cancel"
      },
      {
        color: "primary",
        disabled: !hasChanges.value || saving.value,
        icon: "Save",
        key: "save",
        onClick: handleSave,
        text: "Save Changes"
      }
    ]
  })
}

watch([hasChanges, saving], setupLayout)

onMounted(setupLayout)
onUnmounted(reset)
</script>

<template>
  <div class="bulk-edit-images">
    <div class="images-preview">
      <ImageGrid
        :images="selectedImages"
        :allow-select="false"
        :allow-click="false"
        :show-actions="false"
        :short-grid="false"
      />
    </div>
    <div class="edit-form">
      <p class="hint">Only filled fields will be applied to all selected images.</p>
      <MetadataEditor
        :initial-metadata="EMPTY_METADATA"
        preview-url=""
        :show-preview="false"
        :show-header="false"
        @update="handleMetadataUpdate"
      />
    </div>
  </div>
</template>

<style lang="scss">
.bulk-edit-images {
  @include fill-parent;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;

  .images-preview {
    width: 100%;
    padding: var(--spacing-4);

    @include breakpoint("md") {
      padding: var(--spacing-8) var(--spacing-8) 0;
    }
  }

  .edit-form {
    padding: var(--spacing-4);
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    height: fit-content;
    gap: var(--spacing-4);

    @include breakpoint("md") {
      padding: var(--spacing-8);
      gap: var(--spacing-6);
    }
  }

  .hint {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
}
</style>
