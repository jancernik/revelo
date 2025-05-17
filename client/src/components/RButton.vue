<script setup>
import RIcon from '@/components/RIcon.vue'

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
  <button :class="['r-button', `color-${color}`]" v-bind="$attrs">
    <RIcon v-if="icon" :size="16" :name="icon" class="btn-icon" />
    <span v-if="$slots.default" class="btn-content">
      <slot></slot>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.r-button {
  font-family: Geist, Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.46, 0.03, 0.52, 0.96);
  &.color- {
    &primary {
      background-color: #181818;
      color: #fff;
      border: none;
      line-height: 1.25rem;
      &:hover {
        background-color: #272727;
      }
    }
    &secondary {
      background-color: #fff;
      color: #000;
      border: 1px solid #e4e4e4;
      line-height: 1.125rem;
      &:hover {
        background-color: #f4f4f4;
      }
    }
  }
  &:not(:has(.btn-content)) {
    padding: 0;
    height: 2.25rem;
    width: 2.25rem;
  }
}
</style>
