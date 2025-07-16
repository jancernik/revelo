<script setup>
import { ref } from "vue"

import Button from "#src/components/common/Button.vue"
import ImageUploader from "#src/components/ImageUploader.vue"
import MultipleImagesReview from "#src/components/MultipleImagesReview.vue"
import SimpleImageGrid from "#src/components/SimpleImageGrid.vue"
import api from "#src/utils/api"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const step = ref(1)
const sessionIds = ref([])
const extractedMetadata = ref([])
const previewUrls = ref([])
const previewFilenames = ref([])
const uploadedImages = ref([])
const isLoading = ref(false)
const processingStep = ref("")

const resetState = () => {
  sessionIds.value = []
  extractedMetadata.value = []
  previewUrls.value = []
  previewFilenames.value = []
  uploadedImages.value = []
  isLoading.value = false
  processingStep.value = ""
}

const handleUploadForReview = async (data) => {
  try {
    isLoading.value = true
    processingStep.value = "extracting"
    resetState()

    const { images, previewUrls: urls } = data

    if (images.length > 1) {
      const formData = new FormData()
      images.forEach((image) => formData.append("images", image))

      const response = await api.post("/upload/batch-review", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      response.data.data.forEach((result, index) => {
        sessionIds.value.push(result.sessionId)
        extractedMetadata.value.push(result.metadata)
        previewUrls.value.push(urls[index])
        previewFilenames.value.push(images[index].name)
      })
    } else {
      const formData = new FormData()
      formData.append("image", images[0])

      const response = await api.post("/upload/review", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      const { metadata, sessionId } = response.data.data
      sessionIds.value.push(sessionId)
      extractedMetadata.value.push(metadata)
      previewUrls.value.push(urls[0])
      previewFilenames.value.push(images[0].name)
    }

    step.value = 2
  } catch (error) {
    console.error("Upload error:", error)
  } finally {
    isLoading.value = false
    processingStep.value = ""
  }
}

const handleConfirm = async (data) => {
  try {
    isLoading.value = true
    processingStep.value = "uploading"

    if (data.length > 1) {
      const response = await api.post("/upload/batch-confirm", { batch: data })
      uploadedImages.value = response.data.images
    } else {
      const response = await api.post("/upload/confirm", {
        metadata: data[0].metadata,
        sessionId: data[0].sessionId
      })
      uploadedImages.value.push(response.data.image)
    }

    step.value = 3
  } catch (error) {
    console.error("Confirm error:", error)
  } finally {
    isLoading.value = false
    processingStep.value = ""
    sessionIds.value = []
    extractedMetadata.value = []
    previewUrls.value = []
    previewFilenames.value = []
  }
}

const handleRemoveImage = (index) => {
  sessionIds.value.splice(index, 1)
  extractedMetadata.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
  previewFilenames.value.splice(index, 1)

  if (sessionIds.value.length === 0) {
    handleCancel()
  }
}

const handleCancel = () => {
  step.value = 1
  resetState()
}

const getImageSrc = (image, type) => {
  const version = image.versions.find((v) => v.type === type)
  return version ? `${apiBaseUrl}/${version.path}` : ""
}
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
      <ImageUploader @upload="handleUploadForReview" />
    </div>

    <div v-else-if="step === 2" class="review-step">
      <MultipleImagesReview
        :extracted-metadata="extractedMetadata"
        :preview-urls="previewUrls"
        :preview-filenames="previewFilenames"
        :session-ids="sessionIds"
        @remove-image="handleRemoveImage"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </div>

    <div v-else-if="step === 3" class="complete-step">
      <div class="success-message">
        <h5 class="title">Upload Complete</h5>
        <p class="subtitle">
          Successfully uploaded {{ uploadedImages.length }}
          {{ uploadedImages.length === 1 ? "image" : "images" }}
        </p>
      </div>
      <div class="gallery">
        <SimpleImageGrid
          :images="
            uploadedImages.map((image) => ({
              src: getImageSrc(image, 'thumbnail'),
              name: image.originalFilename
            }))
          "
        />
      </div>

      <div class="actions">
        <Button color="primary" @click="handleCancel"> Upload More Images </Button>
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
    }
  }

  .upload-step,
  .review-step {
    @include fill-parent;
  }

  .complete-step {
    @include fill-parent;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-6);

    .success-message {
      text-align: center;
      margin-bottom: var(--spacing-9);

      .title {
        margin-bottom: 0.25rem;
      }

      .subtitle {
        color: var(--muted-foreground);
      }
    }

    .gallery {
      overflow-y: auto;
      height: 100%;
    }

    .actions {
      display: flex;
      justify-content: center;
      margin-top: var(--spacing-9);
    }
  }
}
</style>
