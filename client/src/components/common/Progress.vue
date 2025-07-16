<script setup>
import { computed } from "vue"

const props = defineProps({
  value: {
    required: true,
    type: [Number, String],
    validator: (value) => parseFloat(value) >= 0 && parseFloat(value) <= 100
  }
})

const roundedValue = computed(() => {
  return Math.round(parseFloat(props.value))
})

const progressStyle = computed(() => {
  return { "--progress-value": roundedValue.value / 100 }
})
</script>

<template>
  <div class="progress" :style="progressStyle"></div>
</template>

<style lang="scss">
.progress {
  $transition: 0.3s ease-in-out;
  position: relative;
  width: 100%;
  height: 0.5rem;
  border-radius: calc(0.5rem / 2);
  overflow: hidden;
  @include light-dark-property(background-color, rgba(#171717, 0.05), rgba(#e5e5e5, 0.05));

  &::before {
    @include fill-parent;
    content: "";
    top: 0;
    left: 0;
    position: absolute;
    background-color: var(--primary);
    transform: scaleX(var(--progress-value));
    transform-origin: left;
    transition: transform $transition;
  }
}
</style>
