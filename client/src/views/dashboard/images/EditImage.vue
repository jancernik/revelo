<script setup>
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"
import { getImageVersion } from "#src/utils/helpers"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
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
const imagesStore = useImagesStore()

const loading = ref(false)
const saving = ref(false)
const image = ref(null)
const metadata = ref({})
const originalMetadata = ref({})

const regularImageVersion = computed(() => getImageVersion(image.value, "regular"))
const hasChanges = computed(() => {
  return JSON.stringify(metadata.value) !== JSON.stringify(originalMetadata.value)
})

const loadImage = async () => {
  try {
    loading.value = true
    image.value = await imagesStore.fetch(props.id)

    const imageMetadata = {
      aperture: image.value.aperture || "",
      camera: image.value.camera || "",
      comment: image.value.comment || "",
      date: image.value.date ? new Date(image.value.date).toISOString().split("T")[0] : null,
      focalLength: image.value.focalLength || "",
      focalLengthEquivalent: image.value.focalLengthEquivalent || "",
      iso: image.value.iso || "",
      lens: image.value.lens || "",
      shutterSpeed: image.value.shutterSpeed || ""
    }

    metadata.value = imageMetadata
    originalMetadata.value = { ...imageMetadata }
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  try {
    saving.value = true
    await imagesStore.updateMetadata(props.id, metadata.value)

    router.push(`/dashboard/images/${props.id}`)
    showToast({
      description: "Image metadata updated successfully.",
      title: "Image Updated",
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
  router.push(`/dashboard/images/${props.id}`)
}

const handleReset = () => {
  metadata.value = { ...originalMetadata.value }
}

const handleMetadataUpdate = (newMetadata) => {
  metadata.value = newMetadata
}

const setupLayout = () => {
  setHeader({
    actions: hasChanges.value
      ? [
          {
            color: "secondary",
            icon: "RotateCcw",
            key: "reset",
            onClick: handleReset,
            text: "Reset"
          }
        ]
      : [],
    title: "Edit Image"
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

onMounted(async () => {
  await loadImage()
  setupLayout()
})

onUnmounted(reset)
</script>

<template>
  <div class="edit-image">
    <div v-if="image" class="edit-layout">
      <div class="image-preview">
        <img
          :src="regularImageVersion.path"
          :alt="image.captions?.en"
          :title="image.captions?.en"
        />
      </div>
      <div class="edit-form">
        <MetadataEditor
          :initial-metadata="metadata"
          :preview-url="regularImageVersion.path"
          :show-header="false"
          :show-preview="false"
          :show-reset-button="false"
          @update="handleMetadataUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.edit-image {
  @include fill-parent;
  padding: var(--spacing-4);

  .edit-layout {
    @include fill-parent;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    height: fit-content;

    @include breakpoint("md") {
      flex-direction: row;
      align-items: flex-start;
      gap: var(--spacing-8);
      height: auto;
    }

    .image-preview {
      display: flex;
      justify-content: center;
      overflow: hidden;

      @include breakpoint("md") {
        flex: 1;
        min-width: 0;
        align-items: flex-start;
      }

      img {
        max-width: 100%;
        max-height: 220px;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: var(--radius-lg);

        @include breakpoint("md") {
          max-height: calc(100vh - 10rem);
        }
      }
    }

    .edit-form {
      @include breakpoint("md") {
        flex: 0 0 320px;
      }
    }
  }
}
</style>
