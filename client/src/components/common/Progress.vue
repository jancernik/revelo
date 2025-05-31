<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    required: true,
    validator: (value) => parseFloat(value) >= 0 && parseFloat(value) <= 100
  }
})

const roundedValue = computed(() => {
  return Math.round(parseFloat(props.value))
})

const progressStyle = computed(() => {
  return { '--progress-value': roundedValue.value / 100 }
})
</script>

<template>
  <div class="progress" :style="progressStyle"></div>
</template>

<style lang="scss" scoped>
$transition: 0.3s ease-in-out;

.progress {
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
    transform: scaleX(var(--progress-value));
    transform-origin: left;
    transition: transform $transition;
  }
}
</style>
