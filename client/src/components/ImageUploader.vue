<script setup>
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import SimpleImageGrid from '@/components/SimpleImageGrid.vue'
import Button from '@/components/common/Button.vue'
import Icon from '@/components/common/Icon.vue'
import { useSettings } from '@/composables/useSettings'

const { settings } = useSettings()
const maxFiles = settings.value.maxUploadFiles || 10

const dragActive = ref(false)
const dropZoneHidden = ref(false)
const dragCounter = ref(0)
const selectedFiles = ref([])
const previewUrls = ref([])
const hasSelectedImages = computed(() => selectedFiles.value.length > 0)
const hasExceededFileLimit = computed(() => selectedFiles.value.length > maxFiles)
const canAddMoreFiles = computed(() => selectedFiles.value.length < maxFiles)

const fileInput = useTemplateRef('file-input')
const container = useTemplateRef('container')

const emit = defineEmits(['upload'])

const handleFileInput = (event) => {
  if (event.target.files?.length > 0) {
    handleFileSelection(Array.from(event.target.files))
  }
}

const handleFileSelection = (files) => {
  for (const file of files) {
    if (!file.type.match(/image\/(jpeg|jpg|png)/i)) {
      alert('Please select valid image files (JPG or PNG)')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Each image size must be less than 50MB')
      return
    }
  }

  selectedFiles.value = [...selectedFiles.value, ...files]

  files.forEach((file) => {
    previewUrls.value.push(URL.createObjectURL(file))
  })
}

const handleRemoveImage = (index) => {
  URL.revokeObjectURL(previewUrls.value[index])
  selectedFiles.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
}

const uploadImages = () => {
  if (selectedFiles.value.length > 0) {
    emit('upload', {
      images: selectedFiles.value,
      previewUrls: previewUrls.value
    })
  }
}

const resetSelection = () => {
  previewUrls.value.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  selectedFiles.value = []
  previewUrls.value = []
}

const handleDragEnter = (event) => {
  event.preventDefault()
  dragCounter.value++
  if (canAddMoreFiles.value) {
    dragActive.value = true
  }
}

const handleDragLeave = (event) => {
  event.preventDefault()
  dragCounter.value--
  if (dragCounter.value <= 0) {
    dragActive.value = false
    dragCounter.value = 0
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDrop = (event) => {
  event.preventDefault()
  dragActive.value = false
  dragCounter.value = 0

  dropZoneHidden.value = true
  setTimeout(() => {
    dropZoneHidden.value = false
  }, 400)

  if (event.dataTransfer.files?.length > 0) {
    handleFileSelection(Array.from(event.dataTransfer.files))
  }
}

onMounted(() => {
  if (container.value) {
    container.value.addEventListener('dragenter', handleDragEnter)
    container.value.addEventListener('dragleave', handleDragLeave)
    container.value.addEventListener('dragover', handleDragOver)
    container.value.addEventListener('drop', handleDrop)
  }
})

onBeforeUnmount(() => {
  if (container.value) {
    container.value.removeEventListener('dragenter', handleDragEnter)
    container.value.removeEventListener('dragleave', handleDragLeave)
    container.value.removeEventListener('dragover', handleDragOver)
    container.value.removeEventListener('drop', handleDrop)
  }
})
</script>

<template>
  <input
    ref="file-input"
    type="file"
    multiple
    style="display: none"
    accept="image/jpeg,image/jpg,image/png"
    :disabled="!canAddMoreFiles"
    @change="handleFileInput"
  />

  <div ref="container" class="image-uploader" :class="{ 'drag-active': dragActive }">
    <div ref="drop-zone" class="drop-zone" :class="{ active: dragActive, hidden: dropZoneHidden }">
      <Icon name="Upload" size="32" />
      <h5 class="drop-text">Drop your images here</h5>
    </div>

    <div v-if="!hasSelectedImages" class="section no-selection">
      <Icon name="Image" size="32" />
      <div class="text">
        <h3 class="title">Select images or drag and drop them here</h3>
        <h4 class="subtitle">JPEG and PNG, up to 50MB</h4>
      </div>
      <Button icon="FolderOpen" @click="fileInput.click()"> Select Images </Button>
    </div>

    <div v-else class="section">
      <div class="section-header">
        <div class="text">
          <h5 class="title">Upload images</h5>
          <p class="subtitle">JPEG and PNG, up to 50MB</p>
        </div>
        <Button icon="FolderOpen" @click="fileInput.click()"> Select Images </Button>
      </div>

      <div class="gallery-title">
        <h4>Selected images</h4>
        <span class="file-counter" :class="{ exceeded: hasExceededFileLimit }">
          {{ selectedFiles.length }}/{{ maxFiles }}</span
        >
      </div>

      <div class="gallery">
        <SimpleImageGrid
          :images="
            selectedFiles.map((image, index) => ({
              src: previewUrls[index],
              name: image.name,
              size: image.size
            }))
          "
          :show-file-names="true"
          :show-file-sizes="true"
          :allow-delete="true"
          @remove="handleRemoveImage"
        />
      </div>

      <div class="actions">
        <Button class="cancel" color="secondary" @click="resetSelection"> Cancel </Button>
        <Button
          class="continue"
          :disabled="hasExceededFileLimit"
          color="primary"
          @click="uploadImages"
        >
          Continue
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.image-uploader {
  $transition: 0.4s cubic-bezier(0.86, 0, 0.07, 1);
  position: relative;
  @include fill-parent;
  padding: var(--spacing-6);
  transition: $transition;

  &.drag-active {
    transform: scale(0.9);
  }

  .drop-zone {
    @include flex-center;
    flex-direction: column;
    gap: var(--spacing-4);
    position: absolute;
    top: calc(var(--spacing-15) / 2);
    left: calc(var(--spacing-15) / 2);
    width: calc(100% - var(--spacing-15));
    height: calc(100% - var(--spacing-15));
    border: 2px dashed var(--border);
    border-radius: var(--radius-xl);
    z-index: 10;
    opacity: 0;
    transition: $transition;
    pointer-events: none;
    backdrop-filter: blur(10px);

    &.active {
      opacity: 1;
      transform: scale(1.1);
      pointer-events: all;
      @include light-dark-property(background-color, rgba(#171717, 0.05), rgba(#e5e5e5, 0.05));
    }
    &.hidden {
      display: none;
    }
  }

  .section {
    @include fill-parent;
    display: flex;
    flex-direction: column;

    &.no-selection {
      @include flex-center;
      gap: var(--spacing-4);

      .text {
        text-align: center;
      }
    }

    .title {
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--muted-foreground);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-6);
      padding-bottom: var(--spacing-6);
      border-bottom: 1px solid var(--border);
    }

    .gallery-title {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      padding-bottom: var(--spacing-6);
      gap: var(--spacing-2);
      h4 {
        @include text('sm');
        font-weight: var(--font-semibold);
        color: var(--primary);
      }

      .file-counter {
        @include flex-center;
        @include text('sm');
        color: var(--muted-foreground);
        background-color: var(--muted);
        border-radius: calc(1.25rem / 2);
        padding-inline: var(--spacing-1);
        height: 1.25rem;
        &.exceeded {
          color: var(--danger);
          background-color: var(--danger-background);
        }
      }
    }

    .gallery {
      overflow-y: auto;
      height: 100%;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-top: var(--spacing-6);
      padding-top: var(--spacing-6);
      border-top: 1px solid var(--border);
      gap: var(--spacing-3);
    }
  }
}
</style>
