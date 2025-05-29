<script setup>
import { useTemplateRef, nextTick, onMounted } from 'vue'
import RIcon from '@/components/RIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  icon: {
    type: String,
    default: ''
  },
  iconPosition: {
    type: String,
    default: 'left',
    validator: (value) => ['left', 'right'].includes(value)
  },
  unit: {
    type: String,
    default: ''
  },
  unitPosition: {
    type: String,
    default: 'right',
    validator: (value) => ['left', 'right'].includes(value)
  },
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
const inputUnit = useTemplateRef('input-unit')
const inputContainer = useTemplateRef('input-container')

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const updateUnitWidth = () => {
  if (inputUnit.value && inputContainer.value && props.unit) {
    const unitWidth = inputUnit.value.offsetWidth
    inputContainer.value.style.setProperty('--unit-width', `${unitWidth}px`)
  }
}

onMounted(() => {
  if (props.unit) {
    nextTick(updateUnitWidth)
  }
})
</script>

<template>
  <div class="r-input">
    <label v-if="label">{{ label }}</label>
    <div
      ref="input-container"
      class="input-container"
      :class="[
        { 'has-icon-left': icon && iconPosition === 'left' },
        { 'has-icon-right': icon && iconPosition === 'right' },
        { 'has-unit-left': unit && unitPosition === 'left' },
        { 'has-unit-right': unit && unitPosition === 'right' },
        { 'has-error': error },
        { 'is-disabled': disabled }
      ]"
    >
      <RIcon
        v-if="icon"
        :name="icon"
        :size="16"
        class="input-icon"
        :class="{ 'icon-left': iconPosition === 'left', 'icon-right': iconPosition === 'right' }"
      />
      <span
        v-if="unit"
        ref="input-unit"
        class="input-unit"
        :class="{ 'unit-left': unitPosition === 'left', 'unit-right': unitPosition === 'right' }"
      >
        {{ unit }}
      </span>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        v-bind="$attrs"
        @input="handleInput"
      />
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="description" class="description">{{ description }}</div>
  </div>
</template>

<style lang="scss" scoped>
.r-input {
  font-family: Geist, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #181818;
  }
}

.input-container {
  position: relative;
  width: 100%;

  &.has-icon-left input {
    padding-left: 2.5rem;
  }

  &.has-icon-right input {
    padding-right: 2.5rem;
  }

  &.has-unit-left input {
    padding-left: calc(0.75rem + var(--unit-width, 2rem) + 0.5rem);
  }

  &.has-unit-right input {
    padding-right: calc(0.75rem + var(--unit-width, 2rem) + 0.5rem);
  }

  &.has-icon-left.has-unit-left input {
    padding-left: calc(2.5rem + var(--unit-width, 2rem) + 0.5rem);
  }

  &.has-icon-right.has-unit-right input {
    padding-right: calc(2.5rem + var(--unit-width, 2rem) + 0.5rem);
  }

  &.has-icon-left.has-unit-left .input-unit.unit-left {
    left: 2.5rem;
  }

  &.has-icon-right.has-unit-right .input-unit.unit-right {
    right: 2.5rem;
  }

  &.has-error input {
    border-color: #ef4444;
  }

  &.is-disabled {
    opacity: 0.7;
  }
}

input {
  font-family: Geist, Arial, sans-serif;
  font-size: 0.875rem;
  width: 100%;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background-color: var(--secondary);
  color: #181818;
  box-sizing: border-box;
  transition: all 0.15s cubic-bezier(0.46, 0.03, 0.52, 0.96);
  line-height: 1.125rem;

  &::placeholder {
    color: var(--input);
    opacity: 1;
  }

  &:disabled {
    opacity: 0.8;
    cursor: not-allowed;
  }
}

.input-icon {
  position: absolute;
  color: var(--input);
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;

  &.icon-left {
    left: 0.75rem;
  }

  &.icon-right {
    right: 0.75rem;
  }
}

.input-unit {
  position: absolute;
  color: #a3a3a3;
  font-size: 0.875rem;
  font-weight: 400;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;

  &.unit-left {
    left: 0.75rem;
  }

  &.unit-right {
    right: 0.75rem;
  }
}

.error {
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 400;
}

.description {
  font-size: 0.75rem;
  color: #737373;
  font-weight: 400;
}
</style>
