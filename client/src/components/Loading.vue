<script setup>
import Progress from "#src/components/common/Progress.vue"
import { computed, useTemplateRef, watch } from "vue"

const HIDE_DELAY = 300
const HIDE_DELAY_MS = `${HIDE_DELAY}ms`

const props = defineProps({
  onComplete: {
    default: null,
    type: Function
  },
  progress: {
    default: null,
    type: Number
  }
})

const loadingIndicator = useTemplateRef("loading-indicator")

const isIndeterminate = computed(() => {
  return props.progress === null
})

const visible = computed(() => {
  return props.progress !== 100
})

watch(
  visible,
  (value) => {
    if (value) {
      if (loadingIndicator.value) loadingIndicator.value.style.display = "flex"
    } else {
      setTimeout(() => {
        if (loadingIndicator.value) loadingIndicator.value.style.display = "none"
        if (props.onComplete) props.onComplete()
      }, HIDE_DELAY)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div ref="loading-indicator" class="loading-indicator" :class="{ hidden: !visible }">
    <div class="loading">
      <Progress :value="progress" :indeterminate="isIndeterminate" />
    </div>
  </div>
</template>
<style lang="scss">
$delay: v-bind(HIDE_DELAY_MS);

.loading-indicator {
  @include fill-parent;
  @include flex-center;
  position: fixed;
  background-color: var(--background);
  top: 0;
  left: 0;
  z-index: z(overlay);
  opacity: 1;
  padding: var(--spacing-8);

  &.hidden {
    transition: 0.2s opacity $delay ease-in-out;
    pointer-events: none;
    opacity: 0;
  }

  .loading {
    @include flex-center;
    flex-direction: column;
    width: 100%;
  }

  .progress {
    max-width: 400px;
  }
}
</style>
