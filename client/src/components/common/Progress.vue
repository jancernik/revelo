<script setup>
import { computed } from "vue"

const props = defineProps({
  indeterminate: {
    default: false,
    type: Boolean
  },
  value: {
    default: null,
    type: [Number, String],
    validator: (value) => value === null || (parseFloat(value) >= 0 && parseFloat(value) <= 100)
  }
})

const isIndeterminate = computed(() => {
  return props.indeterminate || props.value === null
})

const roundedValue = computed(() => {
  if (isIndeterminate.value) return 0
  return Math.round(parseFloat(props.value))
})

const progressStyle = computed(() => {
  return { "--progress-value": roundedValue.value / 100 }
})
</script>

<template>
  <div class="progress" :class="{ indeterminate: isIndeterminate }" :style="progressStyle"></div>
</template>

<style lang="scss">
.progress {
  $transition: 0.3s ease-in-out;
  position: relative;
  width: 100%;
  height: 0.2rem;
  border-radius: calc(0.2rem / 2);
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

  &.indeterminate {
    &::before {
      transform: scaleX(0.3);
      transform-origin: left;
      animation: wobble 1.5s ease-in-out infinite;
      transition: none;
    }
  }
}

@keyframes wobble {
  0%,
  100% {
    transform: translateX(-90%);
  }

  50% {
    transform: translateX(90%);
  }
}
</style>
