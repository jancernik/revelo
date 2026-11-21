import type { AxiosResponse } from "axios"

import { AxiosError, AxiosHeaders } from "axios"
import { createPinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAuthStore } from "#src/stores/auth"
import api from "#src/utils/api"

vi.mock("#src/utils/api", () => ({ default: { post: vi.fn() } }))

const user = {
  admin: true,
  email: "admin@example.com",
  emailVerified: true,
  id: 1,
  username: "admin"
}
const payload = { accessToken: "access-token", user }
const credentials = { password: "Password123", username: "admin" }

const response = <T>(data: T): AxiosResponse<T> => ({
  config: { headers: new AxiosHeaders() },
  data,
  headers: {},
  status: 200,
  statusText: "OK"
})

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (name: string) => values.get(name) ?? null,
    removeItem: (name: string) => {
      values.delete(name)
    },
    setItem: (name: string, value: string) => {
      values.set(name, String(value))
    }
  })
  setActivePinia(createPinia())
  vi.mocked(api.post).mockReset()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  setActivePinia(undefined)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("auth persistence", () => {
  it("starts with null user and token when storage is empty", () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("reads the persisted user and token", () => {
    localStorage.setItem("user", JSON.stringify(user))
    localStorage.setItem("accessToken", "saved-token")
    const store = useAuthStore()
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe("saved-token")
  })

  it.each([42, "legacy-value", { nickname: "legacy" }])(
    "retains a truthy stored JSON value %j",
    (value) => {
      localStorage.setItem("user", String(JSON.stringify(value)))
      expect(useAuthStore().user).toEqual(value)
    }
  )

  it.each([false, 0, ""])("treats a falsy stored JSON value %j as null", (value) => {
    localStorage.setItem("user", JSON.stringify(value))
    expect(useAuthStore().user).toBeNull()
  })

  it("does not silently recover from invalid stored JSON", () => {
    localStorage.setItem("user", "{")
    expect(() => useAuthStore()).toThrow(SyntaxError)
  })

  it("sets and persists the user and token", () => {
    const store = useAuthStore()
    store.setUser(payload)
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe(payload.accessToken)
    expect(localStorage.getItem("user")).toBe(JSON.stringify(user))
    expect(localStorage.getItem("accessToken")).toBe(payload.accessToken)
  })

  it("preserves undefined fields and their storage coercion for a partial payload", () => {
    const store = useAuthStore()
    store.setUser({})
    expect(store.user).toBeUndefined()
    expect(store.accessToken).toBeUndefined()
    expect(localStorage.getItem("user")).toBe("undefined")
    expect(localStorage.getItem("accessToken")).toBe("undefined")
  })

  it("clears only auth state and persistence", () => {
    const store = useAuthStore()
    store.setUser(payload)
    localStorage.setItem("theme", "dark")
    store.clearUser()
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(localStorage.getItem("user")).toBeNull()
    expect(localStorage.getItem("accessToken")).toBeNull()
    expect(localStorage.getItem("theme")).toBe("dark")
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe("auth requests", () => {
  it("logs in with credentials, persists auth and returns the response body", async () => {
    const body = { data: payload, status: "success" }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    expect(await store.login(credentials)).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/login", credentials)
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe(payload.accessToken)
    expect(localStorage.getItem("user")).toBe(JSON.stringify(user))
    expect(localStorage.getItem("accessToken")).toBe(payload.accessToken)
  })

  it("rethrows login failures without clearing existing auth and logs the response body", async () => {
    const body = { data: null, status: "fail" }
    const error = new AxiosError("Login rejected", undefined, undefined, undefined, response(body))
    vi.mocked(api.post).mockRejectedValue(error)
    const store = useAuthStore()
    store.setUser(payload)
    await expect(store.login(credentials)).rejects.toBe(error)
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe(payload.accessToken)
    expect(console.error).toHaveBeenCalledWith("Login failed:", body)
  })

  it("logs out and clears state after a successful request", async () => {
    const body = { data: null, status: "success" }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    store.setUser(payload)
    expect(await store.logout()).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/logout")
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(localStorage.getItem("user")).toBeNull()
    expect(localStorage.getItem("accessToken")).toBeNull()
  })

  it("clears auth and swallows a logout request failure", async () => {
    const error = new Error("Offline")
    vi.mocked(api.post).mockRejectedValue(error)
    const store = useAuthStore()
    store.setUser(payload)
    expect(await store.logout()).toBeUndefined()
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(localStorage.getItem("user")).toBeNull()
    expect(localStorage.getItem("accessToken")).toBeNull()
    expect(console.error).toHaveBeenCalledWith("Logout failed:", error)
  })

  it("refreshes and persists the token without replacing the user", async () => {
    const body = { data: { accessToken: "fresh-token" }, status: "success" }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    store.setUser(payload)
    expect(await store.refreshToken()).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/refresh")
    expect(store.accessToken).toBe("fresh-token")
    expect(store.user).toEqual(user)
    expect(localStorage.getItem("accessToken")).toBe("fresh-token")
  })

  it("clears auth and rethrows a refresh failure", async () => {
    const error = new Error("Refresh failed")
    vi.mocked(api.post).mockRejectedValue(error)
    const store = useAuthStore()
    store.setUser(payload)
    await expect(store.refreshToken()).rejects.toBe(error)
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(localStorage.getItem("user")).toBeNull()
    expect(localStorage.getItem("accessToken")).toBeNull()
  })

  it("signs up with the real user-only response and stores an undefined token", async () => {
    const body = { data: { user }, status: "success" }
    const input = { ...credentials, email: user.email }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    expect(await store.signup(input)).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/signup", input)
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBeUndefined()
    expect(localStorage.getItem("accessToken")).toBe("undefined")
  })

  it("verifies an email token and stores the returned auth", async () => {
    const body = { data: payload, status: "success" }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    expect(await store.verifyEmail("verification-token")).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/verify-email", {
      token: "verification-token"
    })
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe(payload.accessToken)
  })

  it("resends verification without changing auth", async () => {
    const body = { data: null, status: "success" }
    vi.mocked(api.post).mockResolvedValue(response(body))
    const store = useAuthStore()
    store.setUser(payload)
    expect(await store.resendVerificationEmail(user.email)).toBe(body)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/resend-verification", { email: user.email })
    expect(store.user).toEqual(user)
    expect(store.accessToken).toBe(payload.accessToken)
  })

  it("rethrows signup failures", async () => {
    const error = new Error("Signup failed")
    vi.mocked(api.post).mockRejectedValue(error)
    await expect(useAuthStore().signup({ ...credentials, email: user.email })).rejects.toBe(error)
  })

  it("rethrows verify-email failures", async () => {
    const error = new Error("Verification failed")
    vi.mocked(api.post).mockRejectedValue(error)
    await expect(useAuthStore().verifyEmail("bad-token")).rejects.toBe(error)
  })

  it("rethrows resend-verification failures", async () => {
    const error = new Error("Resend failed")
    vi.mocked(api.post).mockRejectedValue(error)
    await expect(useAuthStore().resendVerificationEmail(user.email)).rejects.toBe(error)
  })
})
