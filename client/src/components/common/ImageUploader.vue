<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['upload'])

const dragActive = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)

const isFileSelected = computed(() => !!selectedFile.value)

const handleFileDrop = (event) => {
  event.preventDefault()
  dragActive.value = false

  if (event.dataTransfer.files?.length > 0) {
    handleFileSelection(event.dataTransfer.files[0])
  }
}

const handleFileInput = (event) => {
  if (event.target.files?.length > 0) {
    handleFileSelection(event.target.files[0])
  }
}

const handleFileSelection = (file) => {
  if (!file.type.match(/image\/(jpeg|jpg|png|webp)/i)) {
    alert('Please select a valid image file (JPG, PNG, or WebP)')
    return
  }

  if (file.size > 50 * 1024 * 1024) {
    alert('Image size must be less than 50MB')
    return
  }

  selectedFile.value = file

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)
}

const uploadFile = () => {
  if (selectedFile.value) {
    emit('upload', {
      file: selectedFile.value,
      previewUrl: previewUrl.value
    })
  }
}

const resetSelection = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  selectedFile.value = null
  previewUrl.value = null
}
</script>

<template>
  <div class="image-uploader">
    <div
      v-if="!isFileSelected"
      class="drop-zone"
      :class="{ active: dragActive }"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop="handleFileDrop"
    >
      <div class="drop-content">
        Click to select or drop an image here
        <input
          type="file"
          class="file-input"
          accept="image/jpeg,image/jpg,image/png"
          @change="handleFileInput"
        />
      </div>
    </div>

    <div v-else class="preview-container">
      <div class="image-preview">
        <img :src="previewUrl" :alt="selectedFile.name" />
      </div>

      <div class="file-info">
        <div class="file-name">{{ selectedFile.name }}</div>
        <div class="file-size">{{ (selectedFile.size / (1024 * 1024)).toFixed(2) }} MB</div>
      </div>

      <div class="actions">
        <button class="cancel" @click="resetSelection">Cancel</button>
        <button class="continue" @click="uploadFile">Continue</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.image-uploader {
  width: 100%;
  min-width: 300px;

  .drop-zone {
    height: 200px;
    background-color: $light-grey-1;
    position: relative;

    .drop-content {
      @include fill-parent;
      @include flex-center;
    }

    .file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
  }

  .preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;

    .image-preview {
      @include flex-center;

      img {
        max-width: 100%;
        max-height: 400px;
      }
    }

    .file-info {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
  }

  .actions {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
}
</style>
