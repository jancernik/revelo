<script setup>
import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDialog } from "#src/composables/useDialog"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"
import { getImageVersion } from "#src/utils/helpers"
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"

const props = defineProps({
  id: {
    required: true,
    type: String
  }
})

const router = useRouter()
const { resetHeader, setHeader } = useDashboardLayout()
const { show: showDialog } = useDialog()
const { show: showToast } = useToast()
const imagesStore = useImagesStore()

const image = ref(null)
const loading = ref(true)
const regularImageVersion = computed(() => getImageVersion(image.value, "regular"))
const hasMetadata = computed(() =>
  [
    "camera",
    "lens",
    "aperture",
    "shutterSpeed",
    "iso",
    "focalLength",
    "focalLengthEquivalent",
    "date"
  ].some((k) => image?.value?.[k])
)

const loadImage = async () => {
  try {
    loading.value = true
    image.value = await imagesStore.fetch(props.id)
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
            await imagesStore.remove(props.id)
            router.push("/dashboard/images")
            showToast({
              description: "The image has been deleted successfully.",
              title: "Image Deleted",
              type: "success"
            })
          } catch (error) {
            showToast({
              description: error.message || "Failed to delete image.",
              title: "Delete Failed",
              type: "error"
            })
          }
        },
        icon: "Trash",
        name: "Delete"
      }
    ],
    description: "Are you sure you want to delete this image?",
    title: "Delete Image"
  })
}

const setupLayout = () => {
  setHeader({
    actions: [
      {
        icon: "Pencil",
        key: "edit",
        onClick: () => router.push(`/dashboard/images/${props.id}/edit`),
        text: "Edit"
      },
      {
        icon: "Trash",
        key: "delete",
        onClick: handleDelete,
        text: "Delete"
      }
    ],
    title: "Image"
  })
}

onMounted(async () => {
  await loadImage()
  setupLayout()
})

onUnmounted(resetHeader)
</script>

<template>
  <div v-if="image" class="image-view">
    <div class="image-content">
      <div class="image-wrapper">
        <img :src="regularImageVersion.path" :alt="image.caption" :title="image.caption" />
      </div>
      <div v-if="hasMetadata" class="metadata-wrapper">
        <ImageMetadata :image="image" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.image-view {
  @include fill-parent;
  padding: var(--spacing-4);

  .image-content {
    @include fill-parent;
    display: flex;
    justify-content: center;
    gap: var(--spacing-8);

    .image-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow: hidden;
      min-height: 0;

      img {
        max-width: 100%;
        max-height: calc(calc(100vh - 4.5rem) - var(--spacing-16));
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: var(--radius-lg);
      }
    }

    .image-metadata {
      flex: 1;
      width: max-content;
    }

    @media (max-width: 768px) {
      flex-direction: column;

      .image-metadata {
        width: 100%;
      }
    }
  }
}
</style>
