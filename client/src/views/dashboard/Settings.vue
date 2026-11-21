<script setup lang="ts">
import type { Ref } from "vue"

import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue"

import type { ApiSuccess } from "#src/types/api"
import type { CompleteSetting, SettingValue, TextPairs } from "#src/types/models"

import InputSetting from "#src/components/dashboard/settings/InputSetting.vue"
import SwitchSetting from "#src/components/dashboard/settings/SwitchSetting.vue"
import TextPairsSetting from "#src/components/dashboard/settings/TextPairsSetting.vue"
import ToggleSetting from "#src/components/dashboard/settings/ToggleSetting.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useSettings } from "#src/composables/useSettings"
import api from "#src/utils/api"

const { reset, setFooter, setHeader } = useDashboardLayout()
type DraftValues = Partial<Record<string, SettingValue>>
type SwitchDefinition = InstanceType<typeof SwitchSetting>["$props"]["setting"]

type ViewSetting =
  | Exclude<CompleteSetting, { type: "switch" }>
  | InstanceType<typeof InputSetting>["$props"]["setting"]
  | SwitchDefinition

const settings: Ref<ViewSetting[]> = ref([])
const currentValues: DraftValues = reactive({})
const originalValues: DraftValues = reactive({})
const loading = ref(true)
const isSaving = ref(false)
const isResetting = reactive<Record<string, boolean>>({})
const { refresh } = useSettings()

const isBoolean = (value: SettingValue | undefined): value is boolean => typeof value === "boolean"
const isInputValue = (value: SettingValue | undefined): value is number | string =>
  typeof value === "number" || typeof value === "string"
const isTextPairs = (value: SettingValue | undefined): value is TextPairs =>
  Array.isArray(value) &&
  value.every(
    (pair) =>
      Array.isArray(pair) && pair.length === 2 && pair.every((item) => typeof item === "string")
  )
const isSwitchValue = (
  value: SettingValue | undefined,
  setting: SwitchDefinition
): value is SwitchDefinition["value"] =>
  typeof value === "string" ||
  (typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    [setting.value, setting.default, ...(setting.options || [])].some(
      (candidate) =>
        typeof candidate === "object" && JSON.stringify(candidate) === JSON.stringify(value)
    ))

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
  const changes: DraftValues = {}
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

const getSettingsByCategory = (category: string) => {
  return settings.value
    .filter((setting) => setting.category === category)
    .map((setting) => ({
      setting,
      values: { current: currentValues[setting.name], original: originalValues[setting.name] }
    }))
}

const updateValue = (settingName: string, newValue: SettingValue | undefined) => {
  currentValues[settingName] = newValue
}

const resetValue = (settingName: string) => {
  const original = originalValues[settingName]

  if (Array.isArray(original)) {
    currentValues[settingName] = [...original]
  } else if (typeof original === "object" && original !== null) {
    currentValues[settingName] = { ...original }
  } else {
    currentValues[settingName] = original
  }
}

const resetDefault = async (settingName: string) => {
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

    const settings = Object.entries(changedSettings.value).map(([name, value]) => ({ name, value }))

    await api.put("/settings", { settings })

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
    const response =
      await api.get<ApiSuccess<{ settings: ViewSetting[] }>>("/settings?complete=true")
    settings.value = response.data?.data?.settings || []

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

const setupLayout = () => {
  setHeader({
    title: "Settings"
  })
}

watch(
  () => [hasChanges.value, changedSettingsCount.value, isSaving.value],
  () => {
    if (hasChanges.value) {
      setFooter({
        actions: [
          {
            color: "secondary",
            disabled: isSaving.value,
            icon: "X",
            key: "cancel",
            onClick: () => cancelAllChanges(),
            text: "Cancel"
          },
          {
            color: "primary",
            disabled: isSaving.value,
            icon: "Check",
            key: "save",
            onClick: () => saveAllChanges(),
            text: `Save ${changedSettingsCount.value} ${changedSettingsCount.value === 1 ? "change" : "changes"}`
          }
        ]
      })
    } else {
      setFooter({
        actions: []
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  setupLayout()
  fetchSettings()
})

onUnmounted(reset)
</script>

<template>
  <div v-if="!loading" class="settings">
    <div class="sections-container">
      <div v-for="category in categories" :key="category" class="section">
        <div class="category-header">
          <h5>{{ category }}</h5>
        </div>

        <div class="category-settings">
          <template
            v-for="{ setting, values } in getSettingsByCategory(category)"
            :key="setting.name"
          >
            <ToggleSetting
              v-if="
                setting.type === 'toggle' && isBoolean(values.current) && isBoolean(values.original)
              "
              :setting="setting"
              :current-value="values.current"
              :original-value="values.original"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <InputSetting
              v-else-if="
                (setting.type === 'text' ||
                  setting.type === 'string' ||
                  setting.type === 'integer' ||
                  setting.type === 'decimal') &&
                isInputValue(values.current) &&
                isInputValue(values.original)
              "
              :setting="setting"
              :current-value="values.current"
              :original-value="values.original"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <SwitchSetting
              v-else-if="
                setting.type === 'switch' &&
                isSwitchValue(values.current, setting) &&
                isSwitchValue(values.original, setting)
              "
              :setting="setting"
              :current-value="values.current"
              :original-value="values.original"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <TextPairsSetting
              v-else-if="
                setting.type === 'textpairs' &&
                isTextPairs(values.current) &&
                isTextPairs(values.original)
              "
              :setting="setting"
              :current-value="values.current"
              :original-value="values.original"
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
  </div>
</template>

<style lang="scss">
.settings {
  @include fill-parent;
  display: flex;
  flex-direction: column;
  height: 100%;

  .sections-container {
    @include flex(column, center);
    flex: 1;
    overflow-y: auto;
    gap: var(--spacing-4);

    @include breakpoint("md") {
      gap: var(--spacing-6);
    }

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
