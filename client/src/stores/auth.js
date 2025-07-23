import api from "#src/utils/api"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref(localStorage.getItem("accessToken") || null)
  const user = ref(JSON.parse(localStorage.getItem("user")) || null)

  function clearUser() {
    user.value = null
    accessToken.value = null
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
  }

  async function login({ password, username }) {
    try {
      const response = await api.post("/login", { password, username })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error("Login failed:", error.response?.data || error)
      throw error
    }
  }

  async function logout() {
    try {
      const response = await api.post("/logout")
      return response.data
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error)
    } finally {
      clearUser()
    }
  }

  async function refreshToken() {
    try {
      const response = await api.post("/refresh")
      accessToken.value = response.data?.data?.accessToken
      localStorage.setItem("accessToken", accessToken.value)
      return response.data
    } catch (error) {
      console.error("Token refresh failed:", error.response?.data || error)
      clearUser()
      throw error
    }
  }

  async function resendVerificationEmail(email) {
    try {
      const response = await api.post("/resend-verification", { email })
      return response.data
    } catch (error) {
      console.error("Resend verification failed:", error.response?.data || error)
      throw error
    }
  }

  function setUser(data) {
    user.value = data.user
    accessToken.value = data.accessToken
    localStorage.setItem("user", JSON.stringify(data.user))
    localStorage.setItem("accessToken", data.accessToken)
  }

  async function signup({ email, password, username }) {
    try {
      const response = await api.post("/signup", { email, password, username })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error("Signup failed:", error.response?.data || error)
      throw error
    }
  }

  async function verifyEmail(token) {
    try {
      const response = await api.post("/verify-email", { token })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error("Email verification failed:", error.response?.data || error)
      throw error
    }
  }

  return {
    accessToken,
    clearUser,
    login,
    logout,
    refreshToken,
    resendVerificationEmail,
    setUser,
    signup,
    user,
    verifyEmail
  }
})
