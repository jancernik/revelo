import { defineStore } from 'pinia'
import api from '@/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    accessToken: localStorage.getItem('accessToken') || null
  }),

  actions: {
    async signup({ email, username, password }) {
      try {
        const response = await api.post('/signup', { email, username, password })
        this.setUser(response.data)
      } catch (error) {
        console.error('Signup failed:', error.response?.data || error)
        throw error
      }
    },

    async login({ username, password }) {
      try {
        const response = await api.post('/login', { username, password })
        console.log('response.data: ', response.data)
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
      localStorage.setItem('accessToken', data.accessToken)
    },

    clearUser() {
      this.user = null
      this.accessToken = null
      localStorage.removeItem('accessToken')
    }
  }
})
