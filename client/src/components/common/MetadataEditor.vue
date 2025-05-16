<script setup>
import { ref, computed, onMounted } from 'vue'

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
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const metadata = ref({})
const metadataChanged = computed(() => {
  return JSON.stringify(metadata.value) !== JSON.stringify(props.extractedMetadata)
})

onMounted(() => {
  resetMetadata()
})

const handleConfirm = () => {
  emit('confirm', metadata.value)
}

const resetMetadata = () => {
  metadata.value = JSON.parse(JSON.stringify(props.extractedMetadata))
}
</script>

<template>
  <div class="metadata-editor">
    <div class="image-preview">
      <img :src="previewUrl" :alt="previewFilename" />
    </div>

    <div class="metadata-form">
      <div class="form-group">
        <label for="camera">Camera</label>
        <input
          id="camera"
          v-model="metadata.camera"
          type="text"
          class="form-input"
          placeholder="Camera model"
        />
      </div>

      <div class="form-group">
        <label for="lens">Lens</label>
        <input
          id="lens"
          v-model="metadata.lens"
          type="text"
          class="form-input"
          placeholder="Lens model"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="iso">ISO</label>
          <input id="iso" v-model="metadata.iso" type="text" class="form-input" placeholder="ISO" />
        </div>

        <div class="form-group">
          <label for="aperture">Aperture</label>
          <input
            id="aperture"
            v-model="metadata.aperture"
            type="text"
            class="form-input"
            placeholder="f/number"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="shutterSpeed">Shutter Speed</label>
          <input
            id="shutterSpeed"
            v-model="metadata.shutterSpeed"
            type="text"
            class="form-input"
            placeholder="1/125"
          />
        </div>

        <div class="form-group">
          <label for="focalLength">Focal Length</label>
          <input
            id="focalLength"
            v-model="metadata.focalLength"
            type="text"
            class="form-input"
            placeholder="50mm"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="date">Date Taken</label>
        <input id="date" v-model="metadata.date" type="date" class="form-input" />
      </div>
    </div>
  </div>

  <div class="actions">
    <div>
      <button class="cancel" @click="emit('cancel')">Cancel</button>
    </div>
    <div>
      <button v-if="metadataChanged" class="reset" @click="resetMetadata">Reset Changes</button>
      <button class="confirm" @click="handleConfirm">Confirm & Save</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.metadata-editor {
  @include flex-center;
}

.image-preview {
  @include flex-center;

  img {
    max-width: 100%;
    max-height: 400px;
  }
}
.metadata-form {
  display: flex;
  flex-direction: column;

  .form-group {
    .form-input {
      width: 100%;
      border: 1px solid $light-grey-2;
    }
    label {
      display: block;
      font-size: 1rem;
    }
  }

  .form-row {
    display: flex;
    flex: 1;
  }
}

.actions {
  width: 100%;
  display: flex;
  justify-content: space-between;

  > div {
    display: flex;
  }
}
</style>
