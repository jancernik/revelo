import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import type { ApiSuccess } from "#src/types/api"
import type { KnownSettings } from "#src/types/models"

import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth"
import api, { errorMessage } from "#src/utils/api"

type KnownSetting = {
  [Name in keyof KnownSettings]: { name: Name; value: KnownSettings[Name] }
}[keyof KnownSettings]

export const useSettingsStore = defineStore("settings", () => {
  const { show: showToast } = useToast()
  const authStore = useAuthStore()

  const error = ref<null | string>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const settingsArray = ref<KnownSetting[]>([])

  watch(
    () => authStore.accessToken,
    () => fetchSettings(true)
  )

  const settings = computed(() => {
    return settingsArray.value.reduce<Partial<KnownSettings>>(
      <Name extends keyof KnownSettings>(
        map: Partial<KnownSettings>,
        setting: { name: Name; value: KnownSettings[Name] }
      ) => {
        map[setting.name] = setting.value
        return map
      },
      {}
    )
  })

  async function fetchSettings(force = false) {
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const response = await api.get<ApiSuccess<{ settings: KnownSetting[] }>>("/settings")
      settingsArray.value = response.data?.data?.settings || []
      initialized.value = true
    } catch (err) {
      error.value = errorMessage(err)
      showToast({
        description: error.value,
        title: "Error Fetching Settings",
        type: "error"
      })
    } finally {
      loading.value = false
    }
  }

  async function initialize() {
    if (!initialized.value) {
      await fetchSettings()
    }
  }

  async function refreshSettings() {
    return fetchSettings(true)
  }

  return {
    error,
    fetchSettings,
    initialize,
    initialized,
    loading,
    refreshSettings,
    settings,
    settingsArray
  }
})
