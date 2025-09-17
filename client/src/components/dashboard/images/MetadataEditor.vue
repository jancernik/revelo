<script setup>
import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { computed, nextTick, ref, watch } from "vue"

const props = defineProps({
  initialMetadata: {
    required: true,
    type: Object
  },
  previewFilename: {
    default: "",
    type: String
  },
  previewUrl: {
    required: true,
    type: String
  },

  showHeader: {
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
  focalLengthEquivalent: "",
  iso: "",
  lens: "",
  shutterSpeed: ""
})

const metadata = ref({})
const originalMetadata = ref({})
const shutterSpeed = ref("")
let suppressEmit = false

const initializeMetadata = async () => {
  suppressEmit = true
  const safeMetadata = { ...createDefaultMetadata() }
  if (props.initialMetadata) {
    for (const k in safeMetadata) {
      if (props.initialMetadata[k] !== undefined) {
        safeMetadata[k] = k === "iso" ? String(props.initialMetadata[k]) : props.initialMetadata[k]
      }
    }
  }

  metadata.value = safeMetadata
  originalMetadata.value = { ...safeMetadata }
  updateShutterSpeed()
  await nextTick()
  suppressEmit = false
}

const hasChanges = computed(() => {
  return JSON.stringify(metadata.value) !== JSON.stringify(originalMetadata.value)
})

const handleReset = () => {
  metadata.value = { ...originalMetadata.value }
  updateShutterSpeed()
}

const decimalToShutterSpeed = (decimalValue) => {
  if (!decimalValue || decimalValue === "") return ""
  const shutterNum = Number(decimalValue)
  if (shutterNum >= 1) return `${shutterNum}`
  const denominator = Math.round(1 / shutterNum)
  return `1/${denominator}`
}

const shutterSpeedToDecimal = (displayValue) => {
  if (!displayValue || displayValue === "") return ""
  const trimmed = displayValue.trim()

  if (trimmed.includes("/")) {
    const [numerator, denominator] = trimmed.split("/")
    const num = Number(numerator)
    const den = Number(denominator)
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return (num / den).toString()
    }
  }

  const num = Number(trimmed)
  if (!isNaN(num)) {
    return num.toString()
  }

  return ""
}

const updateShutterSpeed = () => {
  shutterSpeed.value = decimalToShutterSpeed(metadata.value.shutterSpeed)
}

const handleShutterSpeedChange = () => {
  const decimalValue = shutterSpeedToDecimal(shutterSpeed.value)
  metadata.value.shutterSpeed = decimalValue
  shutterSpeed.value = decimalToShutterSpeed(decimalValue)
}

watch(() => props.initialMetadata, initializeMetadata, { deep: true, immediate: true })

watch(
  metadata,
  (newMetadata) => {
    if (suppressEmit) return
    emit("update", newMetadata)
  },
  { deep: true }
)
</script>

<template>
  <div class="metadata-editor" :class="{ 'has-header': showHeader }">
    <div v-if="showHeader" class="metadata-editor-header">
      <div class="header-content">
        <h4>Edit Metadata</h4>
        <p>{{ previewFilename }}</p>
      </div>
      <div v-if="showResetButton" class="header-actions">
        <Button
          v-if="hasChanges"
          class="reset"
          color="secondary"
          icon="RotateCcw"
          @click="handleReset"
        >
          Reset
        </Button>
      </div>
    </div>
    <div class="metadata-editor-content">
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
              v-model="shutterSpeed"
              type="text"
              label="Shutter Speed"
              unit="s"
              unit-position="right"
              placeholder="1/250"
              @blur="handleShutterSpeedChange"
              @keydown.enter="handleShutterSpeedChange"
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
          <div class="form-group">
            <Input
              v-model="metadata.focalLengthEquivalent"
              type="text"
              label="Focal Length (35mm)"
              unit="mm"
              unit-position="right"
              placeholder="50"
            />
          </div>
        </div>
        <div class="form-group">
          <Input v-model="metadata.date" type="date" label="Date Taken" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.metadata-editor {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--background);
  display: flex;
  flex-direction: column;

  &.has-header {
    .metadata-editor-header {
      padding: var(--spacing-4) var(--spacing-5);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-4);

      .header-content {
        flex: 1;
        min-width: 0;

        h4 {
          @include text("sm");
          font-weight: var(--font-semibold);
          color: var(--foreground);
          margin: 0 0 var(--spacing-1) 0;
        }

        p {
          @include text("xs");
          color: var(--muted-foreground);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .header-actions {
        flex-shrink: 0;
      }
    }
  }

  .metadata-editor-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-6);
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
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
      }
    }
  }
}
</style>
