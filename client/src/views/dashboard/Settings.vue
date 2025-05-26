<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import BooleanSetting from '@/components/common/BooleanSetting.vue'
import InputSetting from '@/components/common/InputSetting.vue'
import RButton from '@/components/RButton.vue'
import api from '@/utils/api'

const settings = ref([])
const currentValues = reactive({})
const originalValues = reactive({})
const loading = ref(true)
const isSaving = ref(false)
const isResetting = reactive({})

const categories = computed(() => {
  return [...new Set(settings.value.map((s) => s.category))].sort()
})

const hasChanges = computed(() => {
  return Object.keys(currentValues).some((key) => currentValues[key] !== originalValues[key])
})

const changedSettings = computed(() => {
  const changes = {}
  Object.keys(currentValues).forEach((key) => {
    if (currentValues[key] !== originalValues[key]) {
      changes[key] = currentValues[key]
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
  currentValues[settingName] = originalValues[settingName]
}

const resetDefault = async (settingName) => {
  try {
    isResetting[settingName] = true
    await api.delete(`/settings/${settingName}`)

    const setting = settings.value.find((s) => s.name === settingName)
    if (setting) {
      currentValues[settingName] = setting.default
      originalValues[settingName] = setting.default
    }
  } catch (error) {
    console.error('Error resetting setting to default:', error)
  } finally {
    isResetting[settingName] = false
  }
}

const saveAllChanges = async () => {
  try {
    isSaving.value = true
    await api.put('/settings', changedSettings.value)

    Object.keys(changedSettings.value).forEach((key) => {
      originalValues[key] = currentValues[key]
    })
  } catch (error) {
    console.error('Error saving settings:', error)
  } finally {
    isSaving.value = false
  }
}

const cancelAllChanges = () => {
  Object.keys(currentValues).forEach((key) => {
    currentValues[key] = originalValues[key]
  })
}

const fetchSettings = async () => {
  try {
    loading.value = true
    const response = await api.get('/settings?complete=true')
    settings.value = response.data

    settings.value.forEach((setting) => {
      currentValues[setting.name] = setting.value
      originalValues[setting.name] = setting.value
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
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
          <h3>{{ category }}</h3>
        </div>

        <div class="category-settings">
          <template v-for="setting in getSettingsByCategory(category)" :key="setting.name">
            <BooleanSetting
              v-if="setting.type === 'boolean'"
              :setting="setting"
              :current-value="currentValues[setting.name]"
              :original-value="originalValues[setting.name]"
              :is-resetting="isResetting[setting.name] || false"
              @update="updateValue(setting.name, $event)"
              @reset="resetValue(setting.name)"
              @reset-default="resetDefault(setting.name)"
            />

            <InputSetting
              v-else="
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
          </template>
        </div>
      </div>
    </div>
    <div v-if="hasChanges" class="actions">
      <div class="info">
        <h4>
          {{ changedSettingsCount }} unsaved {{ changedSettingsCount === 1 ? 'change' : 'changes' }}
        </h4>
      </div>
      <RButton icon="X" color="secondary" :disabled="isSaving" @click="cancelAllChanges">
        Cancel
      </RButton>
      <RButton icon="Check" color="primary" :disabled="isSaving" @click="saveAllChanges">
        Save
      </RButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings {
  @include fill-parent;
  padding: $md-spacing * 2;
  display: flex;
  flex-direction: column;
  height: 100%;

  .sections-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: $md-spacing * 2;
    display: flex;
    flex-direction: column;
    gap: $md-spacing * 2;

    .category-settings {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  }

  .category-header {
    padding-bottom: $md-spacing;

    h3 {
      font-size: 1.125rem;
      font-weight: 500;
    }
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-top: $md-spacing * 2;
    border-top: 1px solid #e5e7eb;
    gap: $md-spacing;
    flex-shrink: 0;
    background: #fff;

    .info {
      margin-right: auto;
      h4 {
        font-size: 0.875rem;
        font-weight: 500;
      }
    }
  }
}
</style>
