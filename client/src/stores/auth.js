import { defineStore } from 'pinia'

import api from '@/utils/api'

export const useAuthStore = defineStore('auth', {
  actions: {
    clearUser() {
      this.user = null
      this.accessToken = null
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
    },

    async login({ password, username }) {
      try {
        const response = await api.post('/login', { password, username })
        this.setUser(response.data)
      } catch (error) {
        console.error('Login failed:', error.response?.data || error)
        throw error
      }
    },

    async logout() {
      try {
        await api.post('/logout')
      } catch (error) {
        console.error('Logout failed:', error.response?.data || error)
      } finally {
        this.clearUser()
      }
    },

    async refreshToken() {
      try {
        const response = await api.post('/refresh')
        this.accessToken = response.data.accessToken
        localStorage.setItem('accessToken', this.accessToken)
      } catch (error) {
        console.error('Token refresh failed:', error.response?.data || error)
        this.clearUser()
        throw error
      }
    },

    setUser(data) {
      this.user = data.user
      this.accessToken = data.accessToken
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('accessToken', data.accessToken)
    },

    async signup({ email, password, username }) {
      try {
        const response = await api.post('/signup', { email, password, username })
        this.setUser(response.data)
      } catch (error) {
        console.error('Signup failed:', error.response?.data || error)
        throw error
      }
    }
  },

  state: () => ({
    accessToken: localStorage.getItem('accessToken') || null,
    user: JSON.parse(localStorage.getItem('user')) || null
  })
})
