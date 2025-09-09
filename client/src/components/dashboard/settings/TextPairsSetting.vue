<script setup>
import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { useDialog } from "#src/composables/useDialog"
import { computed, ref } from "vue"

const { show } = useDialog()

const props = defineProps({
  currentValue: {
    required: true,
    type: Array
  },
  isResetting: {
    default: false,
    type: Boolean
  },
  originalValue: {
    required: true,
    type: Array
  },
  setting: {
    required: true,
    type: Object
  }
})

const emit = defineEmits(["update", "reset", "reset-default"])

const editingIndex = ref(-1)

const hasChanged = computed(() => {
  return JSON.stringify(props.currentValue) !== JSON.stringify(props.originalValue)
})

const showResetDefault = computed(() => {
  return JSON.stringify(props.originalValue) !== JSON.stringify(props.setting.default)
})

const pairs = computed(() => {
  if (!Array.isArray(props.currentValue)) return []
  return props.currentValue.map((pair, index) => ({
    index,
    key: Array.isArray(pair) ? pair[0] || "" : "",
    value: Array.isArray(pair) ? pair[1] || "" : ""
  }))
})

const addPair = () => {
  const newPairs = [...props.currentValue, ["", ""]]
  emit("update", newPairs)
  editingIndex.value = newPairs.length - 1
}

const removePair = (index) => {
  const newPairs = props.currentValue.filter((_, i) => i !== index)
  emit("update", newPairs)
  if (editingIndex.value >= newPairs.length) {
    editingIndex.value = -1
  }
}

const updatePair = (index, field, newValue) => {
  const newPairs = [...props.currentValue]
  const currentPair = Array.isArray(newPairs[index]) ? [...newPairs[index]] : ["", ""]
  if (field === "key") {
    currentPair[0] = newValue
  } else if (field === "value") {
    currentPair[1] = newValue
  }
  newPairs[index] = currentPair
  emit("update", newPairs)
}

const startEditing = (index) => {
  editingIndex.value = index
}

const stopEditing = () => {
  editingIndex.value = -1
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
  <div class="textpairs-setting-item">
    <div class="top-section">
      <div class="setting-info">
        <span class="name">{{ setting.name }}</span>
        <span class="description">{{ setting.description }}</span>
      </div>

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
    <div class="setting-control">
      <div class="pairs-container">
        <div v-if="pairs.length === 0" class="empty-state">No pairs defined</div>

        <div v-for="pair in pairs" :key="pair.index" class="pair-item">
          <template v-if="editingIndex === pair.index">
            <div class="pair-inputs">
              <Input
                :model-value="pair.key"
                placeholder="Replace"
                @update:model-value="updatePair(pair.index, 'key', $event)"
              />
              <Input
                :model-value="pair.value"
                placeholder="With"
                @update:model-value="updatePair(pair.index, 'value', $event)"
              />
            </div>
            <div class="pair-actions">
              <Button icon="Check" color="primary" :title="'Save pair'" @click="stopEditing" />
              <Button
                icon="Trash2"
                color="secondary"
                :title="'Delete pair'"
                @click="removePair(pair.index)"
              />
            </div>
          </template>

          <template v-else>
            <div class="pair-display">
              <span class="pair-key">{{ pair.key || "(empty)" }}</span>
              <span class="pair-separator">→</span>
              <span class="pair-value">{{ pair.value || "(empty)" }}</span>
            </div>
            <div class="pair-actions">
              <Button
                icon="Edit"
                color="secondary"
                :title="'Edit pair'"
                @click="startEditing(pair.index)"
              />
              <Button
                icon="Trash2"
                color="secondary"
                :title="'Delete pair'"
                @click="removePair(pair.index)"
              />
            </div>
          </template>
        </div>

        <Button icon="Plus" color="secondary" :disabled="isResetting" @click="addPair">
          Add Pair
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.textpairs-setting-item {
  padding: var(--spacing-6);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.15s ease-in-out;
  display: flex;
  gap: var(--spacing-4);
  flex-direction: column;

  .top-section {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-4);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .name {
    @include text("sm");
    font-weight: var(--font-semibold);
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
    align-items: flex-start;

    .pairs-container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      flex: 1;
      min-width: 0;
    }

    .empty-state {
      @include text("sm");
      @include flex-center;
      color: var(--muted-foreground);
      font-style: italic;
      border: 1px dashed var(--border);
      border-radius: var(--radius-md);
      height: 4rem;
    }

    .pair-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background-color: var(--secondary);
      height: 4rem;

      .pair-inputs {
        display: flex;
        gap: var(--spacing-2);
        flex: 1;
        min-width: 0;
      }

      .pair-display {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        flex: 1;
        min-width: 0;

        .pair-key {
          @include text("sm");
          font-weight: var(--font-medium);
          color: var(--primary);
          word-break: break-word;
        }

        .pair-separator {
          @include text("sm");
          color: var(--muted-foreground);
          flex-shrink: 0;
        }

        .pair-value {
          @include text("sm");
          color: var(--secondary-foreground);
          word-break: break-word;
        }
      }

      .pair-actions {
        display: flex;
        gap: var(--spacing-1);
        flex-shrink: 0;
      }
    }
  }

  .actions {
    display: flex;
    gap: var(--spacing-2);
    min-width: 2.25rem;
    flex-shrink: 0;
  }
}
</style>
