import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { AxiosError, AxiosHeaders } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import { useSettingsStore } from "#src/stores/settings"
import { activatePinia, response, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"
import Signup from "#src/views/Signup.vue"

vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))

const auth = vi.hoisted(
  (): {
    accessToken: null | string
    signup: ReturnType<typeof vi.fn>
    user: unknown
  } => ({
    accessToken: null,
    signup: vi.fn(),
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
  await router.push("/signup")
  await router.isReady()
  const wrapper = mount(Signup, { global: { plugins: [router], stubs: { Icon: true } } })
  return { router, wrapper }
}

const enableSignups = async (enabled: boolean) => {
  vi.mocked(api.get).mockResolvedValue(
    success({ settings: [{ name: "enableSignups", value: enabled }] })
  )
  await useSettingsStore().fetchSettings()
}

const submit = async (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) => {
  await wrapper.get("input[type='email']").setValue("user@example.com")
  await wrapper.get("input[type='text']").setValue("user")
  await wrapper.get("input[type='password']").setValue("Password123")
  await wrapper.get("form").trigger("submit")
  await flushPromises()
}

const admin = {
  admin: true,
  email: "admin@example.com",
  emailVerified: true,
  id: 1,
  username: "admin"
}

const axiosFailure = (data: unknown) =>
  new AxiosError(
    "Request failed",
    undefined,
    { headers: new AxiosHeaders() },
    undefined,
    response(data)
  )

beforeEach(() => {
  activatePinia()
  vi.mocked(api.get).mockReset()
  auth.signup.mockReset()
  auth.user = null
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("Signup", () => {
  it("redirects to /login on mount while signups are disabled", async () => {
    await enableSignups(false)
    const { router, wrapper } = await setup()
    expect(wrapper.find("form").exists()).toBe(false)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/login")
  })

  it("renders the signup form with a login link when signups are enabled", async () => {
    await enableSignups(true)
    const { wrapper } = await setup()
    expect(wrapper.find("form").exists()).toBe(true)
    expect(wrapper.get("a[href='/login']").text()).toBe("Login")
  })

  it("submits the typed credentials and navigates verified admins to /dashboard", async () => {
    await enableSignups(true)
    auth.signup.mockResolvedValue({ data: { user: admin }, status: "success" })
    const { router, wrapper } = await setup()
    await submit(wrapper)
    expect(auth.signup).toHaveBeenCalledExactlyOnceWith({
      email: "user@example.com",
      password: "Password123",
      username: "user"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("navigates verified non-admins to /", async () => {
    await enableSignups(true)
    auth.signup.mockResolvedValue({
      data: { user: { ...admin, admin: false, id: 2, username: "user" } },
      status: "success"
    })
    const { router, wrapper } = await setup()
    await submit(wrapper)
    expect(router.currentRoute.value.path).toBe("/")
  })

  it("navigates unverified signups to the pending page", async () => {
    await enableSignups(true)
    auth.signup.mockResolvedValue({
      data: { user: { ...admin, emailVerified: false, id: 3, username: "user" } },
      status: "success"
    })
    const { router, wrapper } = await setup()
    await submit(wrapper)
    expect(router.currentRoute.value.path).toBe("/verification-pending")
  })

  it("shows the generic failure message when the response has no user", async () => {
    await enableSignups(true)
    auth.signup.mockResolvedValue({ data: null, status: "success" })
    const { wrapper } = await setup()
    await submit(wrapper)
    expect(wrapper.get("ul.error-message li").text()).toBe("Signup failed. Please try again.")
  })

  it("renders the validation list from the API body", async () => {
    await enableSignups(true)
    auth.signup.mockRejectedValue(
      axiosFailure({
        data: { validation: [{ message: "Invalid email" }, { message: "Short password" }] },
        message: "Validation failed",
        status: "fail"
      })
    )
    const { router, wrapper } = await setup()
    await submit(wrapper)
    expect(wrapper.findAll("ul.error-message li").map((item) => item.text())).toEqual([
      "Invalid email",
      "Short password"
    ])
    expect(router.currentRoute.value.fullPath).toBe("/signup")
  })

  it("shows the API failure message when there is no validation list", async () => {
    await enableSignups(true)
    auth.signup.mockRejectedValue(
      axiosFailure({ message: "Email already registered", status: "error" })
    )
    const { wrapper } = await setup()
    await submit(wrapper)
    expect(wrapper.get("ul.error-message li").text()).toBe("Email already registered")
  })

  it("falls back to the generic failure message when the body has no message", async () => {
    await enableSignups(true)
    auth.signup.mockRejectedValue(axiosFailure({ data: null, status: "fail" }))
    const { wrapper } = await setup()
    await submit(wrapper)
    expect(wrapper.get("ul.error-message li").text()).toBe("Signup failed. Please try again.")
  })

  it("redirects an already verified admin to /dashboard on mount", async () => {
    await enableSignups(true)
    auth.user = admin
    const { router, wrapper } = await setup()
    expect(wrapper.find("form").exists()).toBe(true)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("redirects an already verified non-admin to / on mount", async () => {
    await enableSignups(true)
    auth.user = { ...admin, admin: false, id: 2, username: "user" }
    const { router } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })
})
