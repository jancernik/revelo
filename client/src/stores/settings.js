import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth.js"
import api from "#src/utils/api"

export const useSettingsStore = defineStore("settings", () => {
  const { show: showToast } = useToast()
  const authStore = useAuthStore()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const settingsArray = ref([])

  watch(
    () => authStore.accessToken,
    () => fetchSettings(true)
  )

  const settings = computed(() => {
    return settingsArray.value.reduce((map, setting) => {
      map[setting.name] = setting.value
      return map
    }, {})
  })

  async function fetchSettings(force = false) {
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const response = await api.get("/settings")
      settingsArray.value = response.data?.data?.settings || []
      initialized.value = true
    } catch (error) {
      error.value = error.response?.data?.message || error.message
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
