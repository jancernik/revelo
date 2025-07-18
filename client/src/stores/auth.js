import api from "#src/utils/api"
import { defineStore } from "pinia"

export const useAuthStore = defineStore("auth", {
  actions: {
    clearUser() {
      this.user = null
      this.accessToken = null
      localStorage.removeItem("user")
      localStorage.removeItem("accessToken")
    },

    async login({ password, username }) {
      try {
        const response = await api.post("/login", { password, username })
        this.setUser(response.data.data)
        return response.data
      } catch (error) {
        console.error("Login failed:", error.response?.data || error)
        throw error
      }
    },

    async logout() {
      try {
        const response = await api.post("/logout")
        return response.data
      } catch (error) {
        console.error("Logout failed:", error.response?.data || error)
      } finally {
        this.clearUser()
      }
    },

    async refreshToken() {
      try {
        const response = await api.post("/refresh")
        this.accessToken = response.data?.data?.accessToken
        localStorage.setItem("accessToken", this.accessToken)
        return response.data
      } catch (error) {
        console.error("Token refresh failed:", error.response?.data || error)
        this.clearUser()
        throw error
      }
    },

    async resendVerificationEmail(email) {
      try {
        const response = await api.post("/resend-verification", { email })
        return response.data
      } catch (error) {
        console.error("Resend verification failed:", error.response?.data || error)
        throw error
      }
    },

    setUser(data) {
      this.user = data.user
      this.accessToken = data.accessToken
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("accessToken", data.accessToken)
    },

    async signup({ email, password, username }) {
      try {
        const response = await api.post("/signup", { email, password, username })
        this.setUser(response.data.data)
        return response.data
      } catch (error) {
        console.error("Signup failed:", error.response?.data || error)
        throw error
      }
    },

    async verifyEmail(token) {
      try {
        const response = await api.post("/verify-email", { token })
        this.setUser(response.data.data)
        return response.data
      } catch (error) {
        console.error("Email verification failed:", error.response?.data || error)
        throw error
      }
    }
  },

  state: () => ({
    accessToken: localStorage.getItem("accessToken") || null,
    user: JSON.parse(localStorage.getItem("user")) || null
  })
})
