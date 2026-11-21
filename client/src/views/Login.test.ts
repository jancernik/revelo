import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { AxiosError, AxiosHeaders } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import { useSettingsStore } from "#src/stores/settings"
import { activatePinia, response, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"
import Login from "#src/views/Login.vue"

vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))

const auth = vi.hoisted(
  (): {
    accessToken: null | string
    login: ReturnType<typeof vi.fn>
    setUser: ReturnType<typeof vi.fn>
    user: unknown
  } => ({
    accessToken: null,
    login: vi.fn(),
    setUser: vi.fn(),
    user: null
  })
)

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, path: "/" },
  { component: { template: "<div />" }, path: "/dashboard" },
  { component: { template: "<div />" }, path: "/verification-pending" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const setup = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/login")
  await router.isReady()
  const wrapper = mount(Login, { global: { plugins: [router], stubs: { Icon: true } } })
  return { router, wrapper }
}

const enableSignups = async (enabled: boolean) => {
  vi.mocked(api.get).mockResolvedValue(
    success({ settings: [{ name: "enableSignups", value: enabled }] })
  )
  await useSettingsStore().fetchSettings()
}

const admin = {
  admin: true,
  email: "admin@example.com",
  emailVerified: true,
  id: 1,
  username: "admin"
}

beforeEach(() => {
  activatePinia()
  vi.mocked(api.get).mockReset()
  auth.login.mockReset()
  auth.setUser.mockReset()
  auth.user = null
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Login", () => {
  it("renders the login form without the signup link while signups are disabled", async () => {
    const { wrapper } = await setup()
    expect(wrapper.find("form").exists()).toBe(true)
    expect(wrapper.find("a[href='/signup']").exists()).toBe(false)
  })

  it("shows the signup link when signups are enabled", async () => {
    await enableSignups(true)
    const { wrapper } = await setup()
    expect(wrapper.get("a[href='/signup']").text()).toBe("Sign Up")
  })

  it("submits the typed username and password and navigates admins to /dashboard", async () => {
    auth.login.mockResolvedValue({})
    const { router, wrapper } = await setup()
    auth.user = admin
    await wrapper.get("input").setValue("admin")
    await wrapper.get("input[type='password']").setValue("Password123")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(auth.login).toHaveBeenCalledExactlyOnceWith({
      password: "Password123",
      username: "admin"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("navigates verified non-admins to /", async () => {
    auth.login.mockResolvedValue({})
    const { router, wrapper } = await setup()
    auth.user = { ...admin, admin: false, id: 2, username: "user" }
    await wrapper.get("input").setValue("user")
    await wrapper.get("input[type='password']").setValue("Password123")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })

  it("shows the invalid credentials message on a rejected login", async () => {
    auth.login.mockRejectedValue(new Error("Request failed"))
    const { wrapper } = await setup()
    await wrapper.get("input").setValue("admin")
    await wrapper.get("input[type='password']").setValue("Password123")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(wrapper.get(".error-message").text()).toBe("Invalid username or password.")
    expect(wrapper.get("button[type='submit']").attributes("disabled")).toBeUndefined()
  })

  it("routes an unverified login to the pending page through setUser", async () => {
    const body = {
      accessToken: "access-token",
      requiresVerification: true,
      user: { ...admin, emailVerified: false, id: 3, username: "pending" }
    }
    auth.login.mockRejectedValue(
      new AxiosError(
        "Unverified",
        undefined,
        { headers: new AxiosHeaders() },
        undefined,
        response(body)
      )
    )
    const { router, wrapper } = await setup()
    await wrapper.get("input").setValue("pending")
    await wrapper.get("input[type='password']").setValue("Password123")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(auth.setUser).toHaveBeenCalledExactlyOnceWith(body)
    expect(router.currentRoute.value.path).toBe("/verification-pending")
    expect(wrapper.find(".error-message").exists()).toBe(false)
  })

  it("redirects an already verified admin to /dashboard on mount", async () => {
    auth.user = admin
    const { router, wrapper } = await setup()
    expect(wrapper.find("form").exists()).toBe(true)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("redirects an already verified non-admin to / on mount", async () => {
    auth.user = { ...admin, admin: false, id: 2, username: "user" }
    const { router } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })
})
