import type { Pinia } from "pinia"

import { flushPromises } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAuthStore } from "#src/stores/auth"
import { useSettingsStore } from "#src/stores/settings"
import { activatePinia, deferred, failure, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"

const toast = vi.hoisted(() => vi.fn())
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))

let pinia: Pinia
beforeEach(() => {
  pinia = activatePinia()
  vi.mocked(api.get).mockReset()
  toast.mockReset()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.unstubAllGlobals()
})

describe("settings store", () => {
  it("starts empty and derives a name/value map with last duplicate winning", async () => {
    const store = useSettingsStore()
    expect(store.settings).toEqual({})
    const settings = [
      { name: "enableSignups", value: false },
      { name: "maxUploadFiles", value: 10 },
      { name: "replaceCameraNames", value: [["Old", "New"]] },
      { name: "maxUploadFiles", value: 20 },
      { name: "custom", value: { enabled: true } }
    ]
    vi.mocked(api.get).mockResolvedValue(success({ settings }))
    await store.fetchSettings()
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/settings")
    expect(store.settingsArray).toEqual(settings)
    expect(store.settings).toEqual({
      custom: { enabled: true },
      enableSignups: false,
      maxUploadFiles: 20,
      replaceCameraNames: [["Old", "New"]]
    })
    expect(store.initialized).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it("skips fetches while loading", async () => {
    const pending = deferred<ReturnType<typeof success>>()
    vi.mocked(api.get).mockReturnValue(pending.promise)
    const store = useSettingsStore()
    const first = store.fetchSettings()
    expect(store.loading).toBe(true)
    await store.fetchSettings()
    expect(api.get).toHaveBeenCalledTimes(1)
    pending.resolve(success({ settings: [] }))
    await first
    expect(store.loading).toBe(false)
  })

  it("allows a forced fetch while another fetch is loading", async () => {
    const pending = deferred<ReturnType<typeof success>>()
    vi.mocked(api.get)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(success({ settings: [] }))
    const store = useSettingsStore()
    const first = store.fetchSettings()
    await store.fetchSettings(true)
    expect(api.get).toHaveBeenCalledTimes(2)
    pending.resolve(success({ settings: [] }))
    await first
  })

  it("skips initialized fetches and forces refreshSettings", async () => {
    vi.mocked(api.get).mockResolvedValue(success({ settings: [] }))
    const store = useSettingsStore()
    await store.fetchSettings()
    await store.fetchSettings()
    expect(api.get).toHaveBeenCalledTimes(1)
    await store.refreshSettings()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it("initializes only once", async () => {
    vi.mocked(api.get).mockResolvedValue(success({ settings: [] }))
    const store = useSettingsStore()
    await store.initialize()
    await store.initialize()
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it.each([undefined, "Backend detail"])(
    "stores errors, shows a toast and swallows fetch failure: %s",
    async (serverMessage) => {
      const error = failure("Axios detail", serverMessage)
      vi.mocked(api.get).mockRejectedValue(error)
      const store = useSettingsStore()
      await expect(store.fetchSettings()).resolves.toBeUndefined()
      expect(store.error).toBe(serverMessage || "Axios detail")
      expect(store.loading).toBe(false)
      expect(store.initialized).toBe(false)
      expect(toast).toHaveBeenCalledExactlyOnceWith({
        description: serverMessage || "Axios detail",
        title: "Error Fetching Settings",
        type: "error"
      })
      vi.mocked(api.get).mockResolvedValue(success({ settings: [] }))
      await store.fetchSettings()
      expect(store.error).toBeNull()
      expect(store.initialized).toBe(true)
    }
  )

  it("forces a settings refetch when the auth token changes", async () => {
    vi.mocked(api.get).mockResolvedValue(success({ settings: [] }))
    const store = useSettingsStore()
    await store.fetchSettings()
    useAuthStore().accessToken = "new-token"
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(2)
    useAuthStore().clearUser()
    await flushPromises()
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it("falls back to an empty array when response settings are missing", async () => {
    vi.mocked(api.get).mockResolvedValue(success({}))
    const store = useSettingsStore()
    await store.fetchSettings()
    expect(store.settingsArray).toEqual([])
    expect(store.settings).toEqual({})
    expect(store.initialized).toBe(true)
  })
})
