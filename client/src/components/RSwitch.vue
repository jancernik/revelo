<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const handleToggle = (event) => {
  emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <div class="switch">
    <label>
      <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="handleToggle" />
      <div class="slider" :class="{ active: modelValue, disabled }">
        <span></span>
      </div>
      <span v-if="label" class="label-text">{{ label }}</span>
    </label>
  </div>
</template>

<style lang="scss" scoped>
$transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);

.switch {
  display: inline-block;

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    user-select: none;
    cursor: pointer;

    &:has(input:disabled) {
      cursor: not-allowed;

      .label-text {
        color: #999;
      }
    }
  }

  input {
    display: none;
  }

  .slider {
    position: relative;
    width: 2.25rem;
    height: 1.25rem;
    background-color: #ccc;
    border-radius: 0.625rem;
    transition: $transition;

    &.active {
      background-color: #000;

      span {
        transform: translateX(1rem);
      }
    }

    &.disabled {
      opacity: 0.5;
      background-color: #e0e0e0;

      &.active {
        background-color: #272727;
      }
    }

    span {
      position: absolute;
      top: 0.125rem;
      left: 0.125rem;
      width: 1rem;
      height: 1rem;
      background-color: #fff;
      border-radius: 50%;
      transition: $transition;
    }
  }

  .label-text {
    font-size: 0.875rem;
    color: #000;
    transition: $transition;
  }
}
</style>
