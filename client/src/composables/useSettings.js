import { useSettingsStore } from "#src/stores/settings"
import { computed } from "vue"

export function useSettings() {
  const store = useSettingsStore()

  return {
    refresh: store.refreshSettings,
    settings: computed(() => store.settings)
  }
}
