<script setup>
import { ref } from 'vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import MetadataEditor from '@/components/common/MetadataEditor.vue'
import api from '@/api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

const step = ref(1)
const sessionId = ref(null)
const extractedMetadata = ref(null)
const previewUrl = ref(null)
const previewFilename = ref(null)
const uploadedImage = ref(null)

const handleUploadForReview = async (data) => {
  try {
    const formData = new FormData()
    formData.append('image', data.file)

    const response = await api.post('/upload/review', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    sessionId.value = response.data.data.sessionId
    extractedMetadata.value = response.data.data.metadata
    previewUrl.value = data.previewUrl
    previewFilename.value = data.file.name
    step.value = 2
  } catch (error) {
    console.error('Upload error:', error)
  }
}

const handleConfirm = async (data) => {
  if (!sessionId.value) {
    return
  }

  try {
    const response = await api.post('/upload/confirm', {
      sessionId: sessionId.value,
      metadata: data
    })

    uploadedImage.value = response.data.image
    step.value = 3
  } catch (error) {
    console.error('Confirm error:', error)
  } finally {
    sessionId.value = null
    extractedMetadata.value = null
    previewUrl.value = null
    previewFilename.value = null
  }
}

const handleCancel = () => {
  step.value = 1
  sessionId.value = null
  extractedMetadata.value = null
  previewUrl.value = null
  previewFilename.value = null
  uploadedImage.value = null
}
</script>

<template>
  <div class="upload-image-container">
    <div v-if="step === 1" class="upload">
      <ImageUploader @upload="handleUploadForReview" />
    </div>

    <div v-if="step === 2" class="review">
      <MetadataEditor
        :extracted-metadata="extractedMetadata"
        :preview-url="previewUrl"
        :preview-filename="previewFilename"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </div>

    <div v-if="step === 3" class="complete">
      <div class="image-preview">
        <img
          v-if="uploadedImage"
          :src="`${apiBaseUrl}/${uploadedImage.versions.find((v) => v.type === 'regular')?.path}`"
          :alt="uploadedImage.originalFilename"
        />
      </div>
      <button @click="handleCancel">Upload another one</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.image-upload-container {
  @include flex-center;
}

.complete {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-preview {
  @include flex-center;

  img {
    max-width: 100%;
    max-height: 400px;
  }
}
</style>
