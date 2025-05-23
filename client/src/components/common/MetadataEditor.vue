<script setup>
import RInput from '@/components/RInput.vue'
import RButton from '@/components/RButton.vue'
import { ref, watch, computed } from 'vue'

const props = defineProps({
  extractedMetadata: {
    type: Object,
    required: true
  },
  previewUrl: {
    type: String,
    required: true
  },
  previewFilename: {
    type: String,
    required: true
  },
  showRemoveButton: {
    type: Boolean,
    default: false
  },
  showResetButton: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'remove'])

const createDefaultMetadata = () => ({
  camera: '',
  lens: '',
  iso: '',
  aperture: '',
  shutterSpeed: '',
  focalLength: '',
  date: ''
})

const metadata = ref({})
const originalMetadata = ref({})

const initializeMetadata = () => {
  const safeMetadata = { ...createDefaultMetadata() }

  if (props.extractedMetadata) {
    Object.keys(safeMetadata).forEach((key) => {
      if (props.extractedMetadata[key] !== undefined) {
        safeMetadata[key] = props.extractedMetadata[key]
      }
    })
  }

  metadata.value = safeMetadata
  originalMetadata.value = { ...safeMetadata }
}

const hasChanges = computed(() => {
  return JSON.stringify(metadata.value) !== JSON.stringify(originalMetadata.value)
})

const handleReset = () => {
  metadata.value = { ...originalMetadata.value }
}

const handleRemove = () => {
  emit('remove')
}

watch(
  () => props.extractedMetadata,
  () => initializeMetadata(),
  { immediate: true, deep: true }
)

watch(
  metadata,
  (newMetadata) => {
    emit('update', newMetadata)
  },
  { deep: true }
)
</script>

<template>
  <div class="metadata-editor">
    <div class="image-preview">
      <img :src="previewUrl" :alt="previewFilename" />
    </div>
    <div class="metadata-form">
      <div class="form-group">
        <RInput v-model="metadata.camera" type="text" label="Camera" placeholder="Camera model" />
      </div>
      <div class="form-group">
        <RInput v-model="metadata.lens" type="text" label="Lens" placeholder="Lens model" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <RInput v-model="metadata.iso" type="text" label="ISO" placeholder="400" />
        </div>
        <div class="form-group">
          <RInput
            v-model="metadata.aperture"
            type="text"
            label="Aperture"
            placeholder="4.0"
            unit="f/"
            unit-position="left"
          />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <RInput
            v-model="metadata.shutterSpeed"
            type="text"
            label="Shutter Speed"
            unit="s"
            unit-position="right"
            placeholder="1/250"
          />
        </div>
        <div class="form-group">
          <RInput
            v-model="metadata.focalLength"
            type="text"
            label="Focal Length"
            unit="mm"
            unit-position="right"
            placeholder="50"
          />
        </div>
      </div>
      <div class="form-group">
        <RInput v-model="metadata.date" type="date" label="Date Taken" />
      </div>
      <div v-if="showRemoveButton || showResetButton" class="actions">
        <RButton
          v-if="showResetButton && hasChanges"
          class="reset"
          color="secondary"
          icon="RotateCcw"
          @click="handleReset"
        >
          Reset
        </RButton>
        <RButton
          v-if="showRemoveButton"
          class="remove"
          color="secondary"
          icon="Trash"
          @click="handleRemove"
        >
          Remove
        </RButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.metadata-editor {
  display: flex;
  flex-wrap: wrap;
  gap: $md-spacing * 2;
}

.image-preview {
  @include flex-center;
  flex: 1;
  min-width: 250px;

  img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
  }
}

.metadata-form {
  flex: 2;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .form-row {
    display: flex;
    gap: 1rem;

    .form-group {
      flex: 1;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: $md-spacing;
    padding-top: 0.5rem;
  }
}
</style>
