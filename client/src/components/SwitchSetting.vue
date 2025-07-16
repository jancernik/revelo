<script setup>
import Button from "#src/components/common/Button.vue"
import Switch from "#src/components/common/Switch.vue"
import { useDialog } from "#src/composables/useDialog"
import { computed } from "vue"

const { show } = useDialog()

const props = defineProps({
  currentValue: {
    required: true,
    type: [String, Object]
  },
  isResetting: {
    default: false,
    type: Boolean
  },
  originalValue: {
    required: true,
    type: [String, Object]
  },
  setting: {
    required: true,
    type: Object
  }
})

const emit = defineEmits(["update", "reset", "reset-default"])

const hasChanged = computed(() => {
  const current =
    typeof props.currentValue === "object" ? JSON.stringify(props.currentValue) : props.currentValue
  const original =
    typeof props.originalValue === "object"
      ? JSON.stringify(props.originalValue)
      : props.originalValue

  return current !== original
})

const showResetDefault = computed(() => {
  const original =
    typeof props.originalValue === "object"
      ? JSON.stringify(props.originalValue)
      : props.originalValue
  const defaultVal =
    typeof props.setting.default === "object"
      ? JSON.stringify(props.setting.default)
      : props.setting.default

  return original !== defaultVal
})

const switchOptions = computed(() => {
  if (!props.setting.options) return []

  return props.setting.options.map((option) => {
    if (typeof option === "string") {
      return {
        label: option,
        value: option
      }
    }

    return {
      icon: option.icon,
      label: option.label || option.name || option.value || option.id || option.key,
      value: option.value || option.id || option.key
    }
  })
})

const currentSwitchValue = computed(() => {
  if (typeof props.currentValue === "object") {
    return props.currentValue.value || props.currentValue.id || props.currentValue.key
  }
  return props.currentValue
})

const handleUpdate = (newValue) => {
  const originalOption = props.setting.options?.find((opt) => {
    const optValue = typeof opt === "object" ? opt.value || opt.id || opt.key : opt
    return optValue === newValue
  })

  emit("update", originalOption || newValue)
}

const showResetDefaultDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          emit("reset-default")
        },
        color: "primary",
        name: "Reset"
      }
    ],
    description: `Are you sure you want to reset the setting to its default value?`,
    dismissible: true,
    title: `Reset ${props.setting.name}`
  })
}
</script>

<template>
  <div class="switch-setting-item">
    <div class="setting-info">
      <span class="name">{{ setting.name }}</span>
      <span class="description">{{ setting.description }}</span>
    </div>

    <div class="setting-control">
      <Switch
        :model-value="currentSwitchValue"
        :options="switchOptions"
        @update:model-value="handleUpdate"
      />

      <div class="actions">
        <Button
          v-if="hasChanged"
          icon="X"
          color="secondary"
          :disabled="isResetting"
          :title="`Reset ${setting.name} to saved value`"
          @click="$emit('reset')"
        />

        <Button
          v-else-if="showResetDefault"
          icon="RotateCcw"
          color="secondary"
          :disabled="isResetting"
          :title="`Reset ${setting.name} to default value`"
          @click="showResetDefaultDialog"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.switch-setting-item {
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.15s ease-in-out;
  justify-content: space-between;
  display: flex;
  gap: var(--spacing-2);

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .name {
    @include text("sm");
    font-weight: var(--font-medium);
    color: var(--primary);
  }

  .description {
    @include text("sm");
    font-weight: var(--font-normal);
    color: var(--muted-foreground);
  }

  .setting-control {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .actions {
    display: flex;
    gap: var(--spacing-2);
    min-width: 2.25rem;
  }
}
</style>
