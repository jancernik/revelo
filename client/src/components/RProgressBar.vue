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
  <div class="r-progress-bar" :style="progressStyle"></div>
</template>

<style lang="scss" scoped>
.r-progress-bar {
  position: relative;
  width: 100%;
  height: 0.5rem;
  background-color: $light-grey-1;
  border-radius: 0.25rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    background-color: $black;
    transform: scaleX(var(--progress-bar-value));
    transform-origin: left;
    @include fill-parent;
    transition: transform 0.3s ease-in-out;
  }
}
</style>
