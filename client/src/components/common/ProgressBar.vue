<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    required: true,
    validator: (value) => value >= 0 && value <= 100
  }
})

const roundedValue = computed(() => {
  return Math.round(props.value)
})

const progressStyle = computed(() => {
  return { '--progress-bar-value': roundedValue.value / 100 }
})
</script>

<template>
  <div class="progress-bar" :style="progressStyle"></div>
</template>

<style lang="scss" scoped>
$transition: 0.3s ease-in-out;

.progress-bar {
  position: relative;
  width: 100%;
  height: 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--secondary);
  overflow: hidden;

  &::before {
    @include fill-parent;
    content: '';
    top: 0;
    left: 0;
    position: absolute;
    background-color: var(--secondary-foreground);
    transform: scaleX(var(--progress-bar-value));
    transform-origin: left;
    transition: transform $transition;
  }
}
</style>
