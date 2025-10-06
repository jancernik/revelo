import { useAuthStore } from "#src/stores/auth"
import axios from "axios"

const api = axios.create({
  baseURL: "/api",
  withCredentials: true
})

let refreshTokenPromise = null

api.interceptors.request.use(async (config) => {
  const authStore = useAuthStore()
  const token = authStore.accessToken

  const isRefreshRoute = config.url.includes("/refresh")

  if (token && !isRefreshRoute) {
    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]))
      const expirationTime = tokenPayload.exp * 1000
      const currentTime = Date.now()
      const bufferTime = 60 * 1000

      if (expirationTime - currentTime <= bufferTime) {
        try {
          if (!refreshTokenPromise) refreshTokenPromise = authStore.refreshToken()
          await refreshTokenPromise
          config.headers.Authorization = `Bearer ${authStore.accessToken}`
        } catch {
          config.headers.Authorization = `Bearer ${token}`
        } finally {
          refreshTokenPromise = null
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      authStore.clearUser()
    }
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    if (originalRequest.url.includes("/refresh")) {
      authStore.logout()
      return Promise.reject(error)
    }

    const isAuthRoute = ["/login", "/signup", "/verify-email", "/verification-pending"].some(
      (route) => originalRequest.url.includes(route)
    )

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true
      try {
        if (!refreshTokenPromise) refreshTokenPromise = authStore.refreshToken()
        await refreshTokenPromise
        return api(originalRequest)
      } catch (error) {
        authStore.logout()
        return Promise.reject(error)
      } finally {
        refreshTokenPromise = null
      }
    }

    const isNetworkError =
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      [502, 503, 504].includes(error.response?.status)

    if (isNetworkError) {
      const retryCount = originalRequest._retryCount || 0
      const maxRetries = 5

      if (retryCount < maxRetries) {
        originalRequest._retryCount = retryCount + 1

        const delay = Math.pow(2, retryCount) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))

        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default api
