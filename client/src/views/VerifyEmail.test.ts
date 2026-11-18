import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import VerifyEmail from "#src/views/VerifyEmail.vue"

vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))

const auth = vi.hoisted(
  (): {
    accessToken: null | string
    user: unknown
    verifyEmail: ReturnType<typeof vi.fn>
  } => ({
    accessToken: null,
    user: null,
    verifyEmail: vi.fn()
  })
)

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, path: "/" },
  { component: { template: "<div />" }, path: "/dashboard" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const setup = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/verify-email?token=token-123")
  await router.isReady()
  const wrapper = mount(VerifyEmail, {
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
  vi.useFakeTimers()
  auth.verifyEmail.mockReset()
  auth.user = null
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("VerifyEmail", () => {
  it("verifies the token from the query and starts the success countdown at 3", async () => {
    auth.verifyEmail.mockResolvedValue({})
    const { wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    expect(auth.verifyEmail).toHaveBeenCalledExactlyOnceWith("token-123")
    expect(wrapper.text()).toContain("Email Verified!")
    expect(wrapper.text()).toContain("Redirecting in 3...")
  })

  it("counts down 2 then 1 and redirects admins to /dashboard after 3 seconds", async () => {
    auth.verifyEmail.mockResolvedValue({})
    auth.user = admin
    const { router, wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Redirecting in 2...")
    await vi.advanceTimersByTimeAsync(1000)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Redirecting in 1...")
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })

  it("redirects non-admins to / after the countdown", async () => {
    auth.verifyEmail.mockResolvedValue({})
    auth.user = { ...admin, admin: false, id: 2, username: "user" }
    const { router, wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/")
  })

  it("shows the failure state when verification is rejected", async () => {
    auth.verifyEmail.mockRejectedValue(new Error("Request failed"))
    const { router, wrapper } = await setup()
    await wrapper.get("button").trigger("click")
    await flushPromises()
    expect(wrapper.text()).toContain("Verification Failed")
    expect(wrapper.text()).toContain("The verification link is invalid or has expired.")
    await vi.advanceTimersByTimeAsync(3000)
    expect(router.currentRoute.value.path).toBe("/verify-email")
  })

  it("redirects an already verified admin to /dashboard on mount", async () => {
    auth.user = admin
    const { router, wrapper } = await setup()
    expect(wrapper.get("button").text()).toBe("Verify Email")
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard")
  })
})
