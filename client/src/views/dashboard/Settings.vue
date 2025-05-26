<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/utils/api'
import RSwitch from '@/components/RSwitch.vue'
import RInput from '@/components/RInput.vue'

const settings = ref([])
const currentValues = reactive({})
const originalValues = reactive({})
const loading = ref(true)
const error = ref('')
const isSaving = reactive({})
const isResetting = reactive({})
const isResettingToDefault = reactive({})

const categories = computed(() => {
  return[...new Set(settings.value.map((s) => s.category))].sort()
})

const getSettingsByCategory = (category) => {
  return settings.value.filter((s) => s.category === category)
}

const hasChanged = (settingName) => {
  return currentValues[settingName] !== originalValues[settingName]
}

const showResetButton = (settingName) => {
  if (hasChanged(settingName)) {
    return false
}
    const setting = settings.value.find((s) => s.name === settingName)
  return setting && originalValues[settingName] !== setting.default
}

const updateValue = (settingName, newValue) => {
  currentValues[settingName] = newValue
}

const parseValue = (value, type) => {
  if (value === '' || value === null || value === undefined) return value

  if (type === 'integer') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? value : parsed
  } else if (type === 'decimal') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? value : parsed
  }

  return value
}

const resetValue = async (settingName) => {
  try {
    isResetting[settingName] = true

    await api.delete(`/settings/${settingName}`)

    currentValues[settingName] = originalValues[settingName]

    console.log(`Setting ${settingName} reset successfully`)
  } catch (err) {
    console.error('Error resetting setting:', err)
  } finally {
    isResetting[settingName] = false
  }
}

const resetToDefault = async (settingName) => {
  try {
    isResettingToDefault[settingName] = true

    await api.delete(`/settings/${settingName}`)

    const setting = settings.value.find((s) => s.name === settingName)
    if (setting) {
      currentValues[settingName] = setting.default
      originalValues[settingName] = setting.default
    }

    console.log(`Setting ${settingName} reset to default successfully`)
  } catch (err) {
    console.error('Error resetting setting to default:', err)
  } finally {
    isResettingToDefault[settingName] = false
  }
}

const saveValue = async (settingName) => {
  try {
    isSaving[settingName] = true

    await api.put(`/settings/${settingName}`, {
      value: currentValues[settingName]
    })

    originalValues[settingName] = currentValues[settingName]

    console.log(`Setting ${settingName} saved successfully`)
  } catch (err) {
    console.error('Error saving setting:', err)
  } finally {
    isSaving[settingName] = false
  }
}

const fetchSettings = async () => {
  try {
    loading.value = true
    error.value = ''

    const response = await api.get('/settings?complete=true')
    settings.value = response.data

    settings.value.forEach((setting) => {
      currentValues[setting.name] = setting.value
      originalValues[setting.name] = setting.value
    })
  } catch (err) {
    console.error('Error fetching settings:', err)
    error.value = 'Failed to load settings.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettings)
</script>

<template>
  <div class="settings">
    <div v-if="!loading" class="settings-content">
      <div v-for="category in categories" :key="category" class="category-section">
        <h2>{{ category }}</h2>

        <div
          v-for="setting in getSettingsByCategory(category)"
          :key="setting.name"
          class="setting-item"
        >
          <div v-if="setting.type === 'boolean'" class="setting-row">
            <div class="setting-info">
              <div class="setting-header">
                <span class="setting-name">{{ setting.name }}</span>
                <span class="setting-description">{{ setting.description }}</span>
              </div>
              <RSwitch
                :model-value="currentValues[setting.name]"
                @update:model-value="updateValue(setting.name, $event)"
              />
            </div>
            <div class="setting-actions">
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon"
                :disabled="isResetting[setting.name]"
                title="Reset to saved value"
                @click="resetValue(setting.name)"
              >
                ✕
              </button>
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon btn-primary"
                :disabled="isSaving[setting.name]"
                title="Save changes"
                @click="saveValue(setting.name)"
              >
                ✓
              </button>
              <button
                v-if="showResetButton(setting.name)"
                class="btn btn-icon btn-default"
                :disabled="isResettingToDefault[setting.name]"
                title="Reset to default"
                @click="resetToDefault(setting.name)"
              >
                ↺
              </button>
            </div>
          </div>

          <div
            v-else-if="setting.type === 'integer' || setting.type === 'decimal'"
            class="setting-row"
          >
            <div class="setting-info">
              <div class="setting-header">
                <span class="setting-name">{{ setting.name }}</span>
                <span class="setting-description">{{ setting.description }}</span>
              </div>
              <RInput
                :model-value="currentValues[setting.name]"
                :type="setting.type === 'integer' ? 'number' : 'number'"
                :step="setting.type === 'decimal' ? '0.01' : '1'"
                @update:model-value="updateValue(setting.name, parseValue($event, setting.type))"
              />
            </div>
            <div class="setting-actions">
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon"
                :disabled="isResetting[setting.name]"
                title="Reset to saved value"
                @click="resetValue(setting.name)"
              >
                ✕
              </button>
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon btn-primary"
                :disabled="isSaving[setting.name]"
                title="Save changes"
                @click="saveValue(setting.name)"
              >
                ✓
              </button>
              <button
                v-if="showResetButton(setting.name)"
                class="btn btn-icon btn-default"
                :disabled="isResettingToDefault[setting.name]"
                title="Reset to default"
                @click="resetToDefault(setting.name)"
              >
                ↺
              </button>
            </div>
          </div>

          <div v-else-if="setting.type === 'string'" class="setting-row">
            <div class="setting-info">
              <div class="setting-header">
                <span class="setting-name">{{ setting.name }}</span>
                <span class="setting-description">{{ setting.description }}</span>
              </div>
              <RInput
                :model-value="currentValues[setting.name]"
                type="text"
                @update:model-value="updateValue(setting.name, $event)"
              />
            </div>
            <div class="setting-actions">
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon"
                :disabled="isResetting[setting.name]"
                title="Reset to saved value"
                @click="resetValue(setting.name)"
              >
                ✕
              </button>
              <button
                v-if="hasChanged(setting.name)"
                class="btn btn-icon btn-primary"
                :disabled="isSaving[setting.name]"
                title="Save changes"
                @click="saveValue(setting.name)"
              >
                ✓
              </button>
              <button
                v-if="showResetButton(setting.name)"
                class="btn btn-icon btn-default"
                :disabled="isResettingToDefault[setting.name]"
                title="Reset to default"
                @click="resetToDefault(setting.name)"
              >
                ↺
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
