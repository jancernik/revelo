import { isAxiosError } from "axios"
import { defineStore } from "pinia"
import { ref } from "vue"

import type { ApiFailure, ApiSuccess } from "#src/types/api"
import type { AuthPayload } from "#src/types/models"

import api from "#src/utils/api"

export interface LoginCredentials {
  password: string
  username: string
}

export interface SignupCredentials extends LoginCredentials {
  email: string
}

export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<null | string | undefined>(localStorage.getItem("accessToken") || null)
  const user = ref<unknown>(JSON.parse(localStorage.getItem("user") ?? "null") || null)

  function clearUser() {
    user.value = null
    accessToken.value = null
    localStorage.removeItem("user")
    localStorage.removeItem("accessToken")
  }

  async function login({ password, username }: LoginCredentials) {
    try {
      const response = await api.post<ApiSuccess<AuthPayload>>("/login", { password, username })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error(
        "Login failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
      throw error
    }
  }

  async function logout() {
    try {
      const response = await api.post<ApiSuccess<null>>("/logout")
      return response.data
    } catch (error) {
      console.error(
        "Logout failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
    } finally {
      clearUser()
    }
  }

  async function refreshToken() {
    try {
      const response = await api.post<ApiSuccess<Pick<AuthPayload, "accessToken">>>("/refresh")
      accessToken.value = response.data?.data?.accessToken
      localStorage.setItem("accessToken", String(accessToken.value))
      return response.data
    } catch (error) {
      console.error(
        "Token refresh failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
      clearUser()
      throw error
    }
  }

  async function resendVerificationEmail(email: string) {
    try {
      const response = await api.post<ApiSuccess<null>>("/resend-verification", { email })
      return response.data
    } catch (error) {
      console.error(
        "Resend verification failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
      throw error
    }
  }

  function setUser(data: Partial<AuthPayload>) {
    user.value = data.user
    accessToken.value = data.accessToken
    localStorage.setItem("user", String(JSON.stringify(data.user)))
    localStorage.setItem("accessToken", String(data.accessToken))
  }

  async function signup({ email, password, username }: SignupCredentials) {
    try {
      const response = await api.post<ApiSuccess<Pick<AuthPayload, "user">>>("/signup", {
        email,
        password,
        username
      })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error(
        "Signup failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
      throw error
    }
  }

  async function verifyEmail(token: string) {
    try {
      const response = await api.post<ApiSuccess<AuthPayload>>("/verify-email", { token })
      setUser(response.data.data)
      return response.data
    } catch (error) {
      console.error(
        "Email verification failed:",
        isAxiosError<ApiFailure>(error) ? error.response?.data || error : error
      )
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
