<script setup>
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue"

import Icon from "@/components/common/Icon.vue"

const props = defineProps({
  disabled: {
    default: false,
    type: Boolean
  },
  modelValue: {
    default: null,
    type: [String, Number]
  },
  options: {
    default: () => [],
    required: true,
    type: Array
  },
  vertical: {
    default: false,
    type: Boolean
  }
})

const emit = defineEmits(["update:modelValue"])
const switchElement = useTemplateRef("switch")

onMounted(() => {
  if (!props.modelValue && props.options.length > 0) {
    emit("update:modelValue", props.options[0].value)
  }

  nextTick(() => {
    setTimeout(() => {
      if (switchElement.value) {
        const indicator = switchElement.value
        indicator.style.setProperty("--transition", "none")

        updateIndicatorPosition()

        requestAnimationFrame(() => {
          indicator.style.removeProperty("--transition")
        })
      }
    }, 0)
  })
})

const valueIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
)

const updateIndicatorPosition = () => {
  if (!switchElement.value || valueIndex.value === -1) return

  const currentIndex = valueIndex.value
  const optionElements = switchElement.value.querySelectorAll(".option")

  if (optionElements.length === 0) return

  if (props.vertical) {
    const currentElement = optionElements[currentIndex]
    const height = currentElement.offsetHeight

    let position = 0
    for (let i = 0; i < currentIndex; i++) {
      position += optionElements[i].offsetHeight
    }

    switchElement.value.style.setProperty("--indicator-width", "calc(100% - 0.25rem)")
    switchElement.value.style.setProperty("--indicator-height", `${height}px`)
    switchElement.value.style.setProperty("--indicator-x", "0px")
    switchElement.value.style.setProperty("--indicator-y", `${position}px`)
  } else {
    const currentElement = optionElements[currentIndex]
    const width = currentElement.offsetWidth

    let position = 0
    for (let i = 0; i < currentIndex; i++) {
      position += optionElements[i].offsetWidth
    }

    switchElement.value.style.setProperty("--indicator-width", `${width}px`)
    switchElement.value.style.setProperty("--indicator-height", "calc(100% - 0.25rem)")
    switchElement.value.style.setProperty("--indicator-x", `${position}px`)
    switchElement.value.style.setProperty("--indicator-y", "0px")
  }
}

watch(valueIndex, () => nextTick(updateIndicatorPosition))

const handleChange = (event) => {
  emit("update:modelValue", event.target.value)
}

const handleKeyDown = (event) => {
  if (props.disabled) return

  const currentIndex = valueIndex.value
  const maxIndex = props.options.length - 1

  if (
    (!props.vertical && event.key === "ArrowLeft") ||
    (props.vertical && event.key === "ArrowUp")
  ) {
    event.preventDefault()
    const newIndex = currentIndex === 0 ? maxIndex : currentIndex - 1
    emit("update:modelValue", props.options[newIndex].value)
  }

  if (
    event.key === "Enter" ||
    (!props.vertical && event.key === "ArrowRight") ||
    (props.vertical && event.key === "ArrowDown")
  ) {
    event.preventDefault()
    const newIndex = currentIndex === maxIndex ? 0 : currentIndex + 1
    emit("update:modelValue", props.options[newIndex].value)
  }
}
</script>

<template>
  <div
    v-if="options.length > 0"
    ref="switch"
    class="switch"
    :class="{
      disabled: disabled,
      vertical: vertical
    }"
    :tabindex="disabled ? -1 : 0"
    v-bind="$attrs"
    @keydown="handleKeyDown"
  >
    <label v-for="option in options" :key="option.value" class="option">
      <input
        type="radio"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="disabled"
        @change="handleChange"
      />
      <span class="value">
        <Icon v-if="option.icon" :name="option.icon" :size="16" />

        <span v-if="option.label">
          {{ option.label }}
        </span>

        <span v-else-if="!option.icon">
          {{ option.value }}
        </span>
      </span>
    </label>
  </div>
</template>

<style lang="scss">
.switch {
  $transition: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  border-radius: var(--radius-md);
  background-color: var(--secondary);
  border: 1px solid var(--border);
  height: 2.25rem;
  padding-inline: 0.125rem;
  overflow: hidden;
  outline: none;
  transition: $transition;

  &.disabled {
    opacity: 0.8;
    cursor: not-allowed;

    .option span {
      cursor: not-allowed;
    }
  }

  &:not(.disabled) .value:hover {
    color: var(--foreground);
  }

  &.vertical {
    padding-block: 0.125rem;
    flex-direction: column;
    height: auto;

    .option {
      height: 2rem;
      width: 100%;
    }
  }

  &::before {
    content: "";
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    background-color: var(--primary);
    border-radius: calc(var(--radius-md) - 0.125rem);
    transition: var(--transition, $transition);
    z-index: 1;
    width: var(--indicator-width);
    height: var(--indicator-height);
    transform: translateX(var(--indicator-x)) translateY(var(--indicator-y));
  }

  .option {
    position: relative;

    input {
      display: none;
    }

    .value {
      position: relative;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0 0.75rem;
      height: 100%;
      color: var(--secondary-foreground);
      transition: $transition;
      user-select: none;
      white-space: nowrap;
      z-index: 2;
    }

    input:checked + .value {
      color: var(--primary-foreground);
    }
  }
}
</style>
