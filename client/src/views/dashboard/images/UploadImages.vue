<script setup>
import Icon from "#src/components/common/Icon.vue"
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import ImageUploader from "#src/components/dashboard/images/ImageUploader.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const { reset, resetFooter, setFooter, setHeader } = useDashboardLayout()
const { show: showToast } = useToast()
const imagesStore = useImagesStore()
const imageUploader = useTemplateRef("image-uploader")

const step = ref(1)
const sessionIds = ref([])
const extractedMetadata = ref([])
const previewUrls = ref([])
const previewFilenames = ref([])
const uploadedImages = ref([])
const isLoading = ref(false)
const processingStep = ref("")
const selectedImageIndex = ref(0)
const metadataArray = ref([])

const hasImages = computed(() => imageUploader.value?.hasSelectedImages)
const hasExceededFileLimit = computed(() => imageUploader.value?.hasExceededFileLimit)
const canAddMoreFiles = computed(() => imageUploader.value?.canAddMoreFiles)
const uploadedImagesCount = computed(() => sessionIds.value?.length)
const currentMetadata = computed(() => metadataArray.value[selectedImageIndex.value] || {})
const currentPreviewUrl = computed(() => previewUrls.value[selectedImageIndex.value] || "")
const currentFilename = computed(() => previewFilenames.value[selectedImageIndex.value] || "")

const handleUploadForReview = async (data) => {
  try {
    isLoading.value = true
    processingStep.value = "extracting"

    const { images, previewUrls: urls } = data

    if (images.length) {
      const imageData = await imagesStore.uploadForReview(images)

      imageData.forEach((image, index) => {
        sessionIds.value.push(image.sessionId)
        extractedMetadata.value.push(image.metadata)
        previewUrls.value.push(urls[index])
        previewFilenames.value.push(images[index].name)
      })

      metadataArray.value = extractedMetadata.value.map((metadata) => ({ ...metadata }))
      selectedImageIndex.value = 0
    }

    step.value = 2
  } catch (error) {
    showToast({
      description: error,
      title: "Error Uploading Images",
      type: "error"
    })
  } finally {
    isLoading.value = false
    processingStep.value = ""
  }
}

const handleConfirm = async () => {
  try {
    isLoading.value = true
    processingStep.value = "uploading"

    const uploadData = sessionIds.value.map((sessionId, index) => ({
      metadata: metadataArray.value[index],
      sessionId
    }))

    if (uploadData.length) {
      uploadedImages.value = await imagesStore.confirmUpload(uploadData)
    }

    step.value = 3
  } catch (error) {
    showToast({
      description: error,
      title: "Error Confirming Upload",
      type: "error"
    })
  } finally {
    isLoading.value = false
    processingStep.value = ""
    sessionIds.value = []
    extractedMetadata.value = []
    previewUrls.value = []
    previewFilenames.value = []
    metadataArray.value = []
  }
}

const handleRemoveImage = (index) => {
  sessionIds.value.splice(index, 1)
  extractedMetadata.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
  previewFilenames.value.splice(index, 1)
  selectedImageIndex.value = Math.min(selectedImageIndex.value, sessionIds.value.length - 1)

  if (sessionIds.value.length === 0) {
    handleCancel()
  }
}

const handleCancel = () => {
  step.value = 1
  sessionIds.value = []
  extractedMetadata.value = []
  previewUrls.value = []
  previewFilenames.value = []
  uploadedImages.value = []
  metadataArray.value = []
  selectedImageIndex.value = 0
  isLoading.value = false
  processingStep.value = ""
}

const handleSelectImage = (index) => {
  selectedImageIndex.value = index
}

const handleMetadataUpdate = (newMetadata) => {
  metadataArray.value[selectedImageIndex.value] = newMetadata
}

const setupUploadLayout = () => {
  setHeader({
    actions: [
      {
        disabled: !canAddMoreFiles.value,
        icon: "FolderOpen",
        key: hasImages.value ? "add-more" : "select-images",
        onClick: () => imageUploader.value?.handleSelectImages(),
        text: hasImages.value ? "Add More" : "Select Images"
      }
    ],
    title: "Upload Images"
  })

  if (hasImages.value) {
    setFooter({
      actions: [
        {
          color: "secondary",
          icon: "X",
          key: "cancel-upload",
          onClick: () => imageUploader.value?.handleResetSelection(),
          text: "Cancel"
        },
        {
          color: "primary",
          disabled: hasExceededFileLimit.value,
          icon: "Check",
          key: "continue-upload",
          onClick: () => imageUploader.value?.handleUploadImages(),
          text: "Continue"
        }
      ]
    })
  } else {
    resetFooter()
  }
}

const setupReviewLayout = () => {
  setHeader({
    actions: [],
    title: `Review Images (${uploadedImagesCount.value})`
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
        icon: "Check",
        key: "confirm",
        onClick: handleConfirm,
        text: "Confirm"
      }
    ]
  })
}

const setupCompleteLayout = () => {
  setHeader({
    actions: [
      {
        color: "secondary",
        icon: "Image",
        key: "view-all",
        onClick: () => router.push("/dashboard/images"),
        text: "All Images"
      },
      {
        color: "primary",
        disabled: canAddMoreFiles.value,
        icon: "Upload",
        key: "upload-more",
        onClick: () => {
          handleCancel()
          nextTick(() => {
            imageUploader.value?.handleSelectImages()
          })
        },
        text: "Upload More"
      }
    ],
    title: "Upload Complete"
  })
  resetFooter()
}

const setupLayout = () => {
  if (step.value === 1) {
    setupUploadLayout()
  } else if (step.value === 2) {
    setupReviewLayout()
  } else if (step.value === 3) {
    setupCompleteLayout()
  } else {
    resetFooter()
  }
}

watch([step, hasImages, canAddMoreFiles, hasExceededFileLimit], setupLayout)
watch(uploadedImagesCount, () => step.value === 2 && setupReviewLayout())

onUnmounted(reset)
</script>

<template>
  <div class="upload-container">
    <div v-if="isLoading" class="loading-state">
      <div class="loading-content">
        <h5 class="loading-title">
          {{ processingStep === "extracting" ? "Extracting metadata..." : "Uploading images..." }}
        </h5>
      </div>
    </div>

    <div v-else-if="step === 1" class="upload-step">
      <ImageUploader ref="image-uploader" @upload="handleUploadForReview" />
    </div>

    <div v-else-if="step === 2" class="review-step">
      <div class="split-view">
        <div class="image-list">
          <div class="image-list-content">
            <div
              v-for="(previewUrl, index) in previewUrls"
              :key="sessionIds[index]"
              class="image-list-item"
              :class="{ selected: selectedImageIndex === index }"
              @click="handleSelectImage(index)"
            >
              <div class="image-preview">
                <img :src="previewUrl" :alt="previewFilenames[index]" />
              </div>
              <div class="image-info">
                <p class="filename">{{ previewFilenames[index] }}</p>
              </div>
              <button
                class="remove-button"
                title="Remove image"
                @click.stop="handleRemoveImage(index)"
              >
                <Icon name="X" size="16" />
              </button>
            </div>
          </div>
        </div>

        <MetadataEditor
          v-if="currentPreviewUrl"
          :initial-metadata="currentMetadata"
          :preview-url="currentPreviewUrl"
          :preview-filename="currentFilename"
          :show-reset-button="true"
          :show-header="true"
          @update="handleMetadataUpdate"
        />
      </div>
    </div>

    <div v-else-if="step === 3" class="complete-step">
      <div class="gallery">
        <ImageGrid :images="uploadedImages" :allow-select="false" :show-actions="false" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.upload-container {
  @include fill-parent;
  display: flex;
  flex-direction: column;

  .loading-state {
    @include flex-center;
    @include fill-parent;

    .loading-content {
      text-align: center;
      max-width: 400px;
      width: 100%;
      padding: var(--spacing-6);

      .loading-title {
        @include text("lg");
        color: var(--foreground);
        margin: 0;
      }
    }
  }

  .upload-step {
    @include fill-parent;
  }

  .review-step {
    @include fill-parent;
    display: flex;
    flex-direction: column;

    .split-view {
      @include fill-parent;
      display: flex;
      gap: var(--spacing-6);
      padding: var(--spacing-6);

      .image-list {
        flex: 0 0 320px;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background-color: var(--background);
        padding: var(--spacing-4);

        .image-list-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-2);
          gap: var(--spacing-4);

          .image-list-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
            padding: var(--spacing-3);
            padding-right: calc(var(--spacing-3) + 1.5rem + var(--spacing-3));
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            border: 1px solid var(--border);

            &:hover .remove-button {
              opacity: 0.5;
            }

            &.selected {
              background-color: var(--primary-background);
              outline: 2px solid var(--primary);
              outline-offset: 2px;
              border: 1px solid transparent;

              .filename {
                color: var(--primary);
                font-weight: var(--font-medium);
              }
            }

            .image-preview {
              flex: 0 0 48px;
              width: 48px;
              height: 48px;
              border-radius: var(--radius-md);
              overflow: hidden;
              background-color: var(--muted);

              img {
                @include fill-parent;
                object-fit: cover;
              }
            }

            .image-info {
              flex: 1;
              min-width: 0;

              .filename {
                @include text("sm");
                font-weight: var(--font-medium);
                color: var(--foreground);
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            }

            .remove-button {
              @include flex-center;
              position: absolute;
              top: 50%;
              right: var(--spacing-3);
              transform: translateY(-50%);
              width: calc(1.5rem - 2px);
              height: calc(1.5rem - 2px);
              background-color: var(--background);
              color: var(--primary-foreground);
              border-radius: 50%;
              border: 2px solid var(--muted-foreground);
              outline: 2px solid var(--background);
              transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
              opacity: 0;
              flex-shrink: 0;

              .icon {
                @include flex-center;
                color: var(--muted-foreground);
              }

              &:active {
                transform: translateY(-50%) scale(0.95);
              }

              &:hover {
                opacity: 1 !important;
              }
            }
          }
        }
      }

      .metadata-editor {
        flex: 1;
      }
    }
  }

  .complete-step {
    @include fill-parent;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-6);

    .gallery {
      overflow-y: auto;
      height: 100%;
    }
  }
}
</style>
