<script setup>
import Icon from "#src/components/common/Icon.vue"
import { computed } from "vue"
import { useTemplateRef } from "vue"

const props = defineProps({
  image: {
    required: true,
    type: Object
  }
})

const imageMetadata = useTemplateRef("image-metadata")
defineExpose({ imageMetadata })

const showCameraGroup = computed(() => {
  return props.image.camera || props.image.lens
})

const showSettingsGroup = computed(() => {
  return (
    props.image.aperture ||
    props.image.shutterSpeed ||
    props.image.iso ||
    props.image.focalLength ||
    props.image.focalLengthEquivalent
  )
})
const showOtherGroup = computed(() => {
  return props.image.date
})

const formatAperture = (aperture) => `f/${aperture}`

const formatFocalLength = (focalLength) => `${focalLength}mm`

const formatShutterSpeed = (shutter) => {
  const shutterNum = Number(shutter)
  if (shutterNum >= 1) return `${shutterNum}s`
  const denominator = Math.round(1 / shutterNum)
  return `1/${denominator}`
}

const formatDate = (dateString) => {
  if (!dateString) return ""
  dateString = dateString.split("T")[0].replace("-", "/")
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}
</script>

<template>
  <div ref="image-metadata" class="image-metadata scrollable">
    <div v-if="showCameraGroup" class="metadata-group">
      <div class="metadata-title">
        <Icon name="Camera" size="20" />
        <h4>Camera</h4>
      </div>
      <div v-if="image.camera" class="metadata-item">
        <span class="label">Camera</span>
        <span class="value">{{ image.camera || "N/A" }}</span>
      </div>
      <div v-if="image.lens" class="metadata-item">
        <span class="label">Lens</span>
        <span class="value">{{ image.lens }}</span>
      </div>
    </div>

    <div v-if="showSettingsGroup" class="metadata-group">
      <div class="metadata-title">
        <Icon name="Aperture" size="20" />
        <h4>Settings</h4>
      </div>
      <div v-if="image.aperture" class="metadata-item">
        <span class="label">Aperture</span>
        <span class="value">{{ formatAperture(image.aperture) }}</span>
      </div>
      <div v-if="image.shutterSpeed" class="metadata-item">
        <span class="label">Shutter</span>
        <span class="value">{{ formatShutterSpeed(image.shutterSpeed) }}</span>
      </div>
      <div v-if="image.iso" class="metadata-item">
        <span class="label">ISO</span>
        <span class="value">{{ image.iso }}</span>
      </div>
      <div v-if="image.focalLength" class="metadata-item">
        <span class="label">Focal Length</span>
        <span class="value">{{ formatFocalLength(image.focalLength) }}</span>
      </div>
      <div v-if="image.focalLengthEquivalent" class="metadata-item">
        <span class="label">Focal Length (35mm)</span>
        <span class="value">{{ formatFocalLength(image.focalLengthEquivalent) }}</span>
      </div>
    </div>

    <div v-if="showOtherGroup" class="metadata-group">
      <div class="metadata-title">
        <Icon name="SquareMenu" size="20" />
        <h4>Other</h4>
      </div>
      <div class="metadata-item">
        <span class="label">Date</span>
        <span class="value">{{ formatDate(image.date) }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.image-metadata {
  @include hide-scrollbar;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);

  .metadata-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);

    .metadata-title {
      @include flex(row, flex-start, center);
      gap: var(--spacing-2);
      margin-bottom: var(--spacing-1);

      h4 {
        @include text("sm");
        font-weight: var(--font-semibold);
        color: var(--foreground);
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .metadata-item {
      @include flex(row, space-between, center);
      gap: var(--spacing-4);
      padding: var(--spacing-2) 0;
      min-height: 2rem;

      .label {
        @include text("sm");
        font-weight: var(--font-medium);
        color: var(--muted-foreground);
        flex-shrink: 0;
      }

      .value {
        @include text("sm");
        font-weight: var(--font-medium);
        color: var(--foreground);
        text-align: right;
      }
    }
  }
}
</style>
