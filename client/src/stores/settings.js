import { defineStore } from 'pinia'

import api from '@/utils/api'

export const useSettingsStore = defineStore('settings', {
  actions: {
    async fetchSettings(force = false) {
      if (this.loading && !force) return
      if (this.initialized && !force) return

      this.loading = true
      this.error = null

      try {
        const response = await api.get('/settings')

        this.settingsArray = response.data
        this.initialized = true
      } catch (error) {
        this.error = error.response?.data?.message || error.message
        console.error('Failed to fetch settings:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async initialize() {
      if (!this.initialized) {
        await this.fetchSettings()
      }
    },

    async refreshSettings() {
      return this.fetchSettings(true)
    }
  },

  getters: {
    settings: (state) => {
      return state.settingsArray.reduce((map, setting) => {
        map[setting.name] = setting.value
        return map
      }, {})
    }
  },

  state: () => ({
    error: null,
    initialized: false,
    loading: false,
    settingsArray: []
  })
})
