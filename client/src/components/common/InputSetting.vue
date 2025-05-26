<script setup>
import { computed } from 'vue'
import RInput from '@/components/RInput.vue'
import RButton from '@/components/RButton.vue'
import { useDialog } from '@/composables/useDialog'

const { show } = useDialog()

const props = defineProps({
  setting: {
    type: Object,
    required: true
  },
  currentValue: {
    type: [String, Number],
    required: true
  },
  originalValue: {
    type: [String, Number],
    required: true
  },
  isResetting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'reset', 'reset-default'])

const hasChanged = computed(() => {
  return props.currentValue !== props.originalValue
})

const showResetDefault = computed(() => {
  return props.originalValue !== props.setting.default
})

const showResetDefaultDialog = () => {
  show({
    title: `Reset ${props.setting.name}`,
    description: `Are you sure you want to reset the setting to its default value?`,
    dismissible: true,
    actions: [
      {
        name: 'Reset',
        color: 'primary',
        callback: () => {
          emit('reset-default')
        }
      }
    ]
  })
}

const inputType = computed(() => {
  return props.setting.type === 'string' ? 'text' : 'number'
})

const inputStep = computed(() => {
  return props.setting.type === 'decimal' ? '0.01' : '1'
})

const parseValue = (value) => {
  if (value === '' || value === null || value === undefined) return value

  if (props.setting.type === 'integer') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? value : parsed
  } else if (props.setting.type === 'decimal') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? value : parsed
  }

  return value
}

const handleUpdate = (newValue) => {
  const parsedValue = props.setting.type !== 'string' ? parseValue(newValue) : newValue
  emit('update', parsedValue)
}
</script>

<template>
  <div class="setting-item">
    <div class="setting-info">
      <span class="name">{{ setting.name }}</span>
      <span class="description">{{ setting.description }}</span>
    </div>

    <div class="setting-control">
      <RInput
        :model-value="currentValue"
        :type="inputType"
        :step="inputStep"
        @update:model-value="handleUpdate"
      />

      <div class="actions">
        <RButton
          v-if="hasChanged"
          icon="X"
          color="secondary"
          :disabled="isResetting"
          :title="`Reset ${setting.name} to saved value`"
          @click="$emit('reset')"
        />

        <RButton
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

<style lang="scss" scoped>
.setting-item {
  padding: $md-spacing * 2;
  border-radius: 0.75rem;
  background-color: #fafafa;
  border: 1px solid #e4e4e4;
  transition: all 0.15s ease-in-out;
  justify-content: space-between;
  display: flex;
  gap: 0.5rem;
  flex-direction: column;

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .name {
    font-weight: 600;
    font-size: 0.875rem;
    color: #181818;
  }

  .description {
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.125rem;
    color: #6b7280;
  }

  .setting-control {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    min-width: 2.25rem;
  }
}
</style>
