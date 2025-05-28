import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useSettings() {
  const store = useSettingsStore()

  return {
    settings: computed(() => store.settings),
    refresh: store.refreshSettings
  }
}
