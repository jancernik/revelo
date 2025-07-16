<script setup>
import { computed, onMounted, reactive, ref } from "vue"

import Button from "@/components/common/Button.vue"
import InputSetting from "@/components/InputSetting.vue"
import SwitchSetting from "@/components/SwitchSetting.vue"
import ToggleSetting from "@/components/ToggleSetting.vue"
import { useSettings } from "@/composables/useSettings"
import api from "@/utils/api"

const settings = ref([])
const currentValues = reactive({})
const originalValues = reactive({})
const loading = ref(true)
const isSaving = ref(false)
const isResetting = reactive({})
const { refresh } = useSettings()

const categories = computed(() => {
  return [...new Set(settings.value.map((s) => s.category))].sort()
})

const hasChanges = computed(() => {
  return Object.keys(currentValues).some((key) => {
    const current = currentValues[key]
    const original = originalValues[key]

    if (Array.isArray(current) && Array.isArray(original)) {
      return JSON.stringify(current) !== JSON.stringify(original)
    }

    if (typeof current === "object" && typeof original === "object" && current && original) {
      return JSON.stringify(current) !== JSON.stringify(original)
    }

    return current !== original
  })
})

const changedSettings = computed(() => {
  const changes = {}
  Object.keys(currentValues).forEach((key) => {
    const current = currentValues[key]
    const original = originalValues[key]

    let hasChanged = false

    if (Array.isArray(current) && Array.isArray(original)) {
      hasChanged = JSON.stringify(current) !== JSON.stringify(original)
    } else if (typeof current === "object" && typeof original === "object" && current && original) {
      hasChanged = JSON.stringify(current) !== JSON.stringify(original)
    } else {
      hasChanged = current !== original
    }

    if (hasChanged) {
      changes[key] = current
    }
  })
  return changes
})

const changedSettingsCount = computed(() => {
  return Object.keys(changedSettings.value).length
})

const getSettingsByCategory = (category) => {
  return settings.value.filter((s) => s.category === category)
}

const updateValue = (settingName, newValue) => {
  currentValues[settingName] = newValue
}

const resetValue = (settingName) => {
  const original = originalValues[settingName]

  if (Array.isArray(original)) {
    currentValues[settingName] = [...original]
  } else if (typeof original === "object" && original !== null) {
    currentValues[settingName] = { ...original }
  } else {
    currentValues[settingName] = original
  }
}

const resetDefault = async (settingName) => {
  try {
    isResetting[settingName] = true
    await api.delete(`/settings/${settingName}`)

    const setting = settings.value.find((s) => s.name === settingName)
    if (setting) {
      const defaultValue = setting.default

      if (Array.isArray(defaultValue)) {
        currentValues[settingName] = [...defaultValue]
        originalValues[settingName] = [...defaultValue]
      } else if (typeof defaultValue === "object" && defaultValue !== null) {
        currentValues[settingName] = { ...defaultValue }
        originalValues[settingName] = { ...defaultValue }
      } else {
        currentValues[settingName] = defaultValue
        originalValues[settingName] = defaultValue
      }
    }
  } catch (error) {
    console.error("Error resetting setting to default:", error)
  } finally {
    refresh()
    isResetting[settingName] = false
  }
}

const saveAllChanges = async () => {
  try {
    isSaving.value = true
    await api.put("/settings", changedSettings.value)

    Object.keys(changedSettings.value).forEach((key) => {
      const current = currentValues[key]

      if (Array.isArray(current)) {
        originalValues[key] = [...current]
      } else if (typeof current === "object" && current !== null) {
        originalValues[key] = { ...current }
      } else {
        originalValues[key] = current
      }
    })
  } catch (error) {
    console.error("Error saving settings:", error)
  } finally {
    refresh()
    isSaving.value = false
  }
}

const cancelAllChanges = () => {
  Object.keys(currentValues).forEach((key) => {
    const original = originalValues[key]

    if (Array.isArray(original)) {
      currentValues[key] = [...original]
    } else if (typeof original === "object" && original !== null) {
      currentValues[key] = { ...original }
    } else {
      currentValues[key] = original
    }
  })
}

const fetchSettings = async () => {
  try {
    loading.value = true
    const response = await api.get("/settings?complete=true")
    settings.value = response.data

    settings.value.forEach((setting) => {
      const value = setting.value

      if (Array.isArray(value)) {
        currentValues[setting.name] = [...value]
        originalValues[setting.name] = [...value]
      } else if (typeof value === "object" && value !== null) {
        currentValues[setting.name] = { ...value }
        originalValues[setting.name] = { ...value }
      } else {
        currentValues[setting.name] = value
        originalValues[setting.name] = value
      }
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettings)
</script>

<template>
  <div v-if="!loading" class="settings">
    <div class="sections-container">
      <div v-for="category in categories" :key="category" class="section">
        <div class="category-header">
          <h5>{{ category }}</h5>
        </div>

        <div class="category-settings">
          <template v-for="setting in getSettingsByCategory(category)" :key="setting.name">
            <ToggleSetting
              v-if="setting.type === 'toggle'"
              :setting="setting"
              :current-value="currentValues[setting.name]"
              :original-value="originalValues[setting.name]"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <InputSetting
              v-else-if="
                setting.type === 'text' ||
                setting.type === 'string' ||
                setting.type === 'integer' ||
                setting.type === 'decimal'
              "
              :setting="setting"
              :current-value="currentValues[setting.name]"
              :original-value="originalValues[setting.name]"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <SwitchSetting
              v-else-if="setting.type === 'switch'"
              :setting="setting"
              :current-value="currentValues[setting.name]"
              :original-value="originalValues[setting.name]"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <div v-else class="setting-item unknown-type">
              <div class="setting-info">
                <span class="name">{{ setting.name }}</span>
                <span class="description">
                  {{ setting.description }} (Unsupported type: {{ setting.type }})
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-if="hasChanges" class="setting-actions">
      <div class="info">
        <h6>
          {{ changedSettingsCount }} unsaved {{ changedSettingsCount === 1 ? "change" : "changes" }}
        </h6>
      </div>
      <Button icon="X" color="secondary" :disabled="isSaving" @click="cancelAllChanges">
        Cancel
      </Button>
      <Button icon="Check" color="primary" :disabled="isSaving" @click="saveAllChanges">
        Save
      </Button>
    </div>
  </div>
</template>

<style lang="scss">
.settings {
  @include fill-parent;
  padding: var(--spacing-6);
  display: flex;
  flex-direction: column;
  height: 100%;

  .sections-container {
    @include flex(column, center);
    flex: 1;
    overflow-y: auto;
    margin-bottom: var(--spacing-6);
    gap: var(--spacing-6);

    .section {
      max-width: 40rem;
      width: 100%;
    }

    .category-settings {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-4);
    }
  }

  .category-header {
    padding-bottom: var(--spacing-3);
  }

  .setting-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--border);
    gap: var(--spacing-3);
    flex-shrink: 0;
    background-color: var(--background);

    .info {
      margin-right: auto;
    }
  }

  .unknown-type {
    padding: var(--spacing-6);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    opacity: 0.6;

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
  }
}
</style>
