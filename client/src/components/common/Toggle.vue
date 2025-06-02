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
  <div class="toggle">
    <label>
      <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="handleToggle" />
      <div class="slider" :class="{ active: modelValue, disabled }">
        <span></span>
      </div>
      <span v-if="label" class="label-text">{{ label }}</span>
    </label>
  </div>
</template>

<style lang="scss">
.toggle {
  $transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-block;

  label {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    user-select: none;
    cursor: pointer;

    &:has(input:disabled) {
      cursor: not-allowed;

      .label-text {
        color: var(--muted-foreground);
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
    background-color: var(--muted);
    border-radius: calc(1.25rem / 2);
    transition: $transition;

    &.active {
      background-color: var(--primary);

      span {
        transform: translateX(1rem);
        background-color: var(--primary-foreground);
      }
    }

    &.disabled {
      opacity: 0.5;
    }

    span {
      position: absolute;
      top: 0.125rem;
      left: 0.125rem;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      transition: $transition;
      background-color: var(--background);
    }

    &:not(.active) span {
      @include light-dark-property(background-color, var(--background), var(--foreground));
    }
  }

  .label-text {
    @include text('sm');
    color: var(--foreground);
    transition: $transition;
  }
}
</style>
