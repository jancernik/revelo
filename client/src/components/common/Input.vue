<script setup>
import Icon from "#src/components/common/Icon.vue"
import { nextTick, onMounted, useTemplateRef } from "vue"

const props = defineProps({
  description: {
    default: "",
    type: String
  },
  disabled: {
    default: false,
    type: Boolean
  },
  error: {
    default: "",
    type: String
  },
  icon: {
    default: "",
    type: String
  },
  iconPosition: {
    default: "left",
    type: String,
    validator: (value) => ["left", "right"].includes(value)
  },
  label: {
    default: "",
    type: String
  },
  modelValue: {
    default: "",
    type: [String, Number]
  },
  multiline: {
    default: false,
    type: Boolean
  },
  placeholder: {
    default: "",
    type: String
  },
  resize: {
    default: "none",
    type: String,
    validator: (value) => ["both", "horizontal", "none", "vertical"].includes(value)
  },
  rows: {
    default: 3,
    type: Number
  },
  type: {
    default: "text",
    type: String
  },
  unit: {
    default: "",
    type: String
  },
  unitPosition: {
    default: "right",
    type: String,
    validator: (value) => ["left", "right"].includes(value)
  }
})

const emit = defineEmits(["update:modelValue"])
const inputUnit = useTemplateRef("input-unit")
const inputContainer = useTemplateRef("input-container")

const handleInput = (event) => {
  emit("update:modelValue", event.target.value)
}

const updateUnitWidth = () => {
  if (inputUnit.value && inputContainer.value && props.unit) {
    const unitWidth = inputUnit.value.offsetWidth
    inputContainer.value.style.setProperty("--unit-width", `${unitWidth}px`)
  }
}

onMounted(() => {
  if (props.unit) {
    nextTick(updateUnitWidth)
  }
})
</script>

<template>
  <div class="input">
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
        { 'is-disabled': disabled },
        { 'is-multiline': multiline }
      ]"
    >
      <Icon
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
      <textarea
        v-if="multiline"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        v-bind="$attrs"
        @input="handleInput"
      />
      <input
        v-else
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

<style lang="scss">
.input {
  font-family: Geist, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;

  label {
    @include text("sm");
    font-weight: var(--font-medium);
    color: var(--secondary-foreground);
  }

  .input-container {
    position: relative;
    width: 100%;

    &.has-icon-left input,
    &.has-icon-left textarea {
      padding-left: 2.5rem;
    }

    &.has-icon-right input,
    &.has-icon-right textarea {
      padding-right: 2.5rem;
    }

    &.has-unit-left input,
    &.has-unit-left textarea {
      padding-left: calc(0.75rem + var(--unit-width, 2rem) + 0.5rem);
    }

    &.has-unit-right input,
    &.has-unit-right textarea {
      padding-right: calc(0.75rem + var(--unit-width, 2rem) + 0.5rem);
    }

    &.has-icon-left.has-unit-left input,
    &.has-icon-left.has-unit-left textarea {
      padding-left: calc(2.5rem + var(--unit-width, 2rem) + 0.5rem);
    }

    &.has-icon-right.has-unit-right input,
    &.has-icon-right.has-unit-right textarea {
      padding-right: calc(2.5rem + var(--unit-width, 2rem) + 0.5rem);
    }

    &.has-icon-left.has-unit-left .input-unit.unit-left {
      left: 2.5rem;
    }

    &.has-icon-right.has-unit-right .input-unit.unit-right {
      right: 2.5rem;
    }

    &.has-error input,
    &.has-error textarea {
      border-color: var(--danger);
    }

    &.is-disabled {
      opacity: 0.7;
    }

    &.is-multiline .input-icon {
      top: 0.875rem;
      transform: none;
    }

    &.is-multiline .input-unit {
      top: 0.875rem;
      transform: none;
    }
  }

  input,
  textarea {
    font-family: Geist, Arial, sans-serif;
    @include text("sm");
    font-weight: var(--font-normal);
    width: 100%;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background-color: var(--secondary);
    color: var(--primary);
    box-sizing: border-box;
    transition: all 0.15s cubic-bezier(0.46, 0.03, 0.52, 0.96);
    line-height: 1.125rem;
    outline: none;

    &::placeholder {
      color: var(--input);
      opacity: 1;
    }

    &:disabled {
      opacity: 0.8;
      cursor: not-allowed;
    }
  }

  textarea {
    resize: v-bind(resize);
    min-height: auto;
    vertical-align: top;
    line-height: 1.4;
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
    color: var(--input);
    @include text("sm");
    font-weight: var(--font-normal);
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
    @include text("xs");
    color: var(--danger);
    font-weight: var(--font-normal);
  }

  .description {
    @include text("xs");
    color: var(--input);
    font-weight: var(--font-normal);
  }
}
</style>
