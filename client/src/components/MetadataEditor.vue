<script setup>
import { computed, ref, watch } from "vue"

import Button from "@/components/common/Button.vue"
import Input from "@/components/common/Input.vue"

const props = defineProps({
  extractedMetadata: {
    required: true,
    type: Object
  },
  previewFilename: {
    required: true,
    type: String
  },
  previewUrl: {
    required: true,
    type: String
  },
  showRemoveButton: {
    default: false,
    type: Boolean
  },
  showResetButton: {
    default: false,
    type: Boolean
  }
})

const emit = defineEmits(["update", "remove"])

const createDefaultMetadata = () => ({
  aperture: "",
  camera: "",
  date: "",
  focalLength: "",
  iso: "",
  lens: "",
  shutterSpeed: ""
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
  emit("remove")
}

watch(
  () => props.extractedMetadata,
  () => initializeMetadata(),
  { deep: true, immediate: true }
)

watch(
  metadata,
  (newMetadata) => {
    emit("update", newMetadata)
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
        <Input v-model="metadata.camera" type="text" label="Camera" placeholder="Camera model" />
      </div>
      <div class="form-group">
        <Input v-model="metadata.lens" type="text" label="Lens" placeholder="Lens model" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <Input v-model="metadata.iso" type="text" label="ISO" placeholder="400" />
        </div>
        <div class="form-group">
          <Input
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
          <Input
            v-model="metadata.shutterSpeed"
            type="text"
            label="Shutter Speed"
            unit="s"
            unit-position="right"
            placeholder="1/250"
          />
        </div>
        <div class="form-group">
          <Input
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
        <Input v-model="metadata.date" type="date" label="Date Taken" />
      </div>
      <div v-if="showRemoveButton || showResetButton" class="actions">
        <Button
          v-if="showResetButton && hasChanges"
          class="reset"
          color="secondary"
          icon="RotateCcw"
          @click="handleReset"
        >
          Reset
        </Button>
        <Button
          v-if="showRemoveButton"
          class="remove"
          color="secondary"
          icon="Trash"
          @click="handleRemove"
        >
          Remove
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.metadata-editor {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-6);

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
    gap: var(--spacing-4);

    .form-row {
      display: flex;
      gap: var(--spacing-4);

      .form-group {
        flex: 1;
      }
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-3);
      padding-top: var(--spacing-2);
    }
  }
}
</style>
