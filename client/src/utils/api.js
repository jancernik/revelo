import axios from "axios"

import { useAuthStore } from "#src/stores/auth"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
})

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = authStore.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config

    if (originalRequest.url.includes("/refresh")) {
      authStore.logout()
      return Promise.reject(error)
    }

    const isAuthRoute =
      originalRequest.url.includes("/login") || originalRequest.url.includes("/signup")

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true
      try {
        await authStore.refreshToken()
        return api(originalRequest)
      } catch (refreshError) {
        authStore.logout()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
