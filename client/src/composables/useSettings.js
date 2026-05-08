import { computed } from "vue"

import { useSettingsStore } from "#src/stores/settings"

export function useSettings() {
  const store = useSettingsStore()

  return {
    refresh: store.refreshSettings,
    settings: computed(() => store.settings)
  }
}
