<script setup>
import Icon from '@/components/common/Icon.vue'

defineProps({
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'primary',
    validator: (value) => {
      return ['primary', 'secondary'].includes(value)
    }
  }
})
</script>

<template>
  <button :class="['button', `color-${color}`]" v-bind="$attrs">
    <Icon v-if="icon" :size="16" :name="icon" />
    <span v-if="$slots.default" class="content">
      <slot></slot>
    </span>
  </button>
</template>

<style lang="scss" scoped>
$transition: all 0.15s ease-in-out;

.button {
  @include flex-center;
  @include text(sm);
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: $transition;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.color- {
    &primary {
      background-color: var(--primary);
      color: var(--primary-foreground);
      border: none;
      line-height: 1.25rem;
      &:not(:disabled) {
        &:hover {
          background-color: var(--primary-hover);
        }
        &:active {
          background-color: var(--primary-active);
        }
      }
    }

    &secondary {
      background-color: var(--secondary);
      color: var(--secondary-foreground);
      border: 1px solid var(--border);
      line-height: 1.125rem;
      &:not(:disabled) {
        &:hover {
          background-color: var(--secondary-hover);
        }
        &:active {
          background-color: var(--secondary-active);
        }
      }
    }
  }

  &:not(:has(.content)) {
    padding: 0;
    height: 2.25rem;
    width: 2.25rem;
  }
}
</style>
