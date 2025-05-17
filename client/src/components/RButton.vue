<script setup>
import { computed, useSlots } from 'vue'
import RIcon from '@/components/RIcon.vue'

defineProps({
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'default',
    validator: (value) => {
      return ['default', 'red', 'green', 'blue', 'yellow'].includes(value)
    }
  }
})
</script>

<template>
  <button :class="['r-button', `color-${color}`]" v-bind="$attrs">
    <RIcon v-if="icon" :size="20" :name="icon" class="btn-icon" />
    <span v-if="$slots.default" class="btn-content">
      <slot></slot>
    </span>
  </button>
</template>

<style lang="scss">
.r-button {
  @include flex-center;
  font-size: 1rem;
  gap: 0.5rem;
  padding-inline: 1rem;
  height: 2.3rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease-in-out;
  color: $black;

  &.color- {
    &default {
      background-color: $black;
      color: $white;
      &:hover {
        background-color: $dark-grey-3;
      }
      &:active {
        background-color: $dark-grey-6;
      }
    }
    &red {
      background-color: $red;
      &:hover {
        background-color: $red-dark-1;
      }
      &:active {
        background-color: $red-dark-2;
      }
    }
    &blue {
      background-color: $blue;
      &:hover {
        background-color: $blue-dark-1;
      }
      &:active {
        background-color: $blue-dark-2;
      }
    }
    &green {
      background-color: $green;
      &:hover {
        background-color: $green-dark-1;
      }
      &:active {
        background-color: $green-dark-2;
      }
    }
    &yellow {
      background-color: $yellow;
      &:hover {
        background-color: $yellow-dark-1;
      }
      &:active {
        background-color: $yellow-dark-2;
      }
    }
  }
  &:not(:has(.btn-content)) {
    padding-inline: 0;
    width: 2.3rem;
  }
}
</style>
