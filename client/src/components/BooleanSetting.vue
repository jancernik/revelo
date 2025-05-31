<script setup>
import { computed } from 'vue'
import Toggle from '@/components/common/Toggle.vue'
import Button from '@/components/common/Button.vue'
import { useDialog } from '@/composables/useDialog'

const { show } = useDialog()

const props = defineProps({
  setting: {
    type: Object,
    required: true
  },
  currentValue: {
    type: Boolean,
    required: true
  },
  originalValue: {
    type: Boolean,
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

const handleUpdate = (newValue) => {
  emit('update', newValue)
}

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
</script>

<template>
  <div class="setting-item">
    <div class="setting-info">
      <span class="name">{{ setting.name }}</span>
      <span class="description">{{ setting.description }}</span>
    </div>

    <div class="setting-control">
      <Toggle :model-value="currentValue" @update:model-value="handleUpdate" />

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
  padding: calc(var(--spacing-3) * 2);
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  transition: all 0.15s ease-in-out;
  justify-content: space-between;
  display: flex;
  gap: 0.5rem;

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }
  .name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--primary);
  }

  .description {
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.125rem;
    color: var(--muted-foreground);
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
