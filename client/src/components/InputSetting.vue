<script setup>
import { computed } from 'vue'
import Input from '@/components/common/Input.vue'
import Button from '@/components/common/Button.vue'
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
      <Input
        :model-value="currentValue"
        :type="inputType"
        :step="inputStep"
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

<style lang="scss" scoped>
.setting-item {
  padding: var(--spacing-6);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  transition: all 0.15s ease-in-out;
  justify-content: space-between;
  display: flex;
  gap: var(--spacing-2);
  flex-direction: column;

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .name {
    @include text('sm');
    font-weight: var(--font-semibold);
    color: var(--primary);
  }

  .description {
    @include text('sm');
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
