import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import VerificationPending from "#src/views/VerificationPending.vue"

vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))

const auth = vi.hoisted(() => ({
  accessToken: null as null | string,
  resendVerificationEmail: vi.fn(),
  user: null as unknown
}))
const toast = vi.hoisted(() => vi.fn())

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, path: "/" },
  { component: { template: "<div />" }, path: "/dashboard" },
  { component: { template: "<div />" }, path: "/signup" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const setup = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/verification-pending")
  await router.isReady()
  const wrapper = mount(VerificationPending, {
    global: { plugins: [router], stubs: { Icon: true } }
  })
  return { router, wrapper }
}

const admin = {
  admin: true,
  email: "admin@example.com",
  emailVerified: true,
  id: 1,
  username: "admin"
}

beforeEach(() => {
  auth.resendVerificationEmail.mockReset()
  auth.user = null
  toast.mockReset()
  vi.spyOn(console, "log").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("VerificationPending", () => {
  it("redirects to /signup on mount without a user", async () => {
    const { router, wrapper } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/signup")
    expect(wrapper.get("button").text()).toBe("Resend Verification Email")
  })

  it("stays and shows the user email while verification is pending", async () => {
    auth.user = { ...admin, emailVerified: false }
    const { router, wrapper } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/verification-pending")
    expect(wrapper.get("strong").text()).toBe("admin@example.com")
    expect(wrapper.get("button").text()).toBe("Resend Verification Email")
  })

  it("redirects a verified admin to /dashboard on mount", async () => {
    auth.user = admin
    const { router } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("redirects a verified non-admin to / on mount", async () => {
    auth.user = { ...admin, admin: false, id: 2, username: "user" }
    const { router } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })

  it("resends the verification email to the user address with a success toast", async () => {
    auth.user = { ...admin, emailVerified: false }
    auth.resendVerificationEmail.mockResolvedValue({})
    const { wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    expect(auth.resendVerificationEmail).toHaveBeenCalledExactlyOnceWith("admin@example.com")
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "Email sent. Please check your inbox.",
      title: "Verification Email Sent",
      type: "success"
    })
  })

  it("shows an error toast when resending fails", async () => {
    auth.user = { ...admin, emailVerified: false }
    auth.resendVerificationEmail.mockRejectedValue(new Error("Request failed"))
    const { wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "There was an error sending the verification email.",
      title: "Error Sending Email",
      type: "error"
    })
  })
})
