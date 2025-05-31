<script setup>
import { ref } from 'vue'
import MetadataEditor from './MetadataEditor.vue'
import Button from '@/components/common/Button.vue'

const props = defineProps({
  extractedMetadata: {
    type: Array,
    required: true
  },
  previewUrls: {
    type: Array,
    required: true
  },
  previewFilenames: {
    type: Array,
    required: true
  },
  sessionIds: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['confirm', 'cancel', 'removeImage'])

const metadataArray = ref(props.extractedMetadata.map((metadata) => ({ ...metadata })))

const handleConfirm = () => {
  const uploadData = props.sessionIds.map((sessionId, index) => ({
    sessionId,
    metadata: metadataArray.value[index]
  }))
  emit('confirm', uploadData)
}

const handleCancel = () => {
  emit('cancel')
}

const handleRemoveImage = (index) => {
  metadataArray.value.splice(index, 1)
  emit('removeImage', index)
}

const handleMetadataUpdate = (index, newMetadata) => {
  metadataArray.value[index] = newMetadata
}
</script>

<template>
  <div class="multiple-images-review">
    <div class="section-header">
      <div class="text">
        <h3 class="title">Review Images ({{ previewUrls.length }})</h3>
        <h4 class="subtitle">Edit EXIF metadata</h4>
      </div>
    </div>

    <div class="image-list">
      <div v-for="(previewUrl, index) in previewUrls" :key="sessionIds[index]" class="image-item">
        <MetadataEditor
          :extracted-metadata="extractedMetadata[index]"
          :preview-url="previewUrl"
          :preview-filename="previewFilenames[index]"
          :show-remove-button="true"
          :show-reset-button="true"
          @update="(newMetadata) => handleMetadataUpdate(index, newMetadata)"
          @remove="() => handleRemoveImage(index)"
        />
        <hr v-if="index < previewUrls.length - 1" />
      </div>
    </div>

    <div class="actions">
      <Button class="cancel" color="secondary" @click="handleCancel"> Cancel </Button>
      <Button class="confirm" color="primary" @click="handleConfirm"> Confirm </Button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.multiple-images-review {
  @include fill-parent;
  display: flex;
  flex-direction: column;
  padding: calc(var(--spacing-3) * 2);

  .title {
    font-size: 1.125rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--muted-foreground);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: calc(var(--spacing-3) * 2);
    padding-bottom: calc(var(--spacing-3) * 2);
    border-bottom: 1px solid var(--border);
  }

  .image-list {
    .image-item {
      hr {
        margin-block: calc(var(--spacing-3) * 2);
        border: 0;
        border-bottom: 1px solid var(--border);
      }
    }
  }

  .image-list {
    overflow-y: auto;
    height: 100%;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-top: calc(var(--spacing-3) * 2);
    padding-top: calc(var(--spacing-3) * 2);
    border-top: 1px solid var(--border);
    gap: var(--spacing-3);
  }
}
</style>
