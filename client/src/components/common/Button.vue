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
$transition: all 0.15s cubic-bezier(0.46, 0.03, 0.52, 0.96);

.button {
  @include flex-center;
  @include text(sm);
  font-family: Geist, Arial, sans-serif;
  gap: var(--spacing-2);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: $transition;
  cursor: pointer;

  &:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }

  &.color- {
    &primary {
      background-color: var(--primary);
      color: var(--primary-foreground);
      border: none;
      line-height: 1.25rem;
      &:hover:not(:disabled) {
        background-color: var(--primary-hover);
      }
    }

    &secondary {
      background-color: var(--secondary);
      color: var(--secondary-foreground);
      border: 1px solid var(--border);
      line-height: 1.125rem;
      &:hover:not(:disabled) {
        background-color: var(--secondary-hover);
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
