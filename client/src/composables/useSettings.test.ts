import type { Pinia } from "pinia"

import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSettings } from "#src/composables/useSettings"
import { useSettingsStore } from "#src/stores/settings"
import { activatePinia, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: vi.fn() }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { get: vi.fn() }
}))

let pinia: Pinia
beforeEach(() => {
  pinia = activatePinia()
  vi.mocked(api.get).mockReset()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.unstubAllGlobals()
})

describe("useSettings", () => {
  it("exposes a computed settings map that follows store updates", async () => {
    const { settings } = useSettings()
    expect(settings.value).toEqual({})
    vi.mocked(api.get).mockResolvedValue(
      success({ settings: [{ name: "maxUploadFiles", value: 12 }] })
    )
    await useSettingsStore().fetchSettings()
    expect(settings.value).toEqual({ maxUploadFiles: 12 })
  })

  it("shares store values across composable calls", async () => {
    const first = useSettings()
    const second = useSettings()
    vi.mocked(api.get).mockResolvedValue(
      success({ settings: [{ name: "enableSignups", value: false }] })
    )
    await useSettingsStore().fetchSettings()
    expect(first.settings.value).toBe(second.settings.value)
    expect(second.settings.value).toEqual({ enableSignups: false })
  })

  it("exposes the bound forced-refresh action", async () => {
    const store = useSettingsStore()
    const { refresh, settings } = useSettings()
    expect(refresh).toBe(store.refreshSettings)
    vi.mocked(api.get)
      .mockResolvedValueOnce(success({ settings: [] }))
      .mockResolvedValueOnce(success({ settings: [{ name: "showLoginLink", value: true }] }))
    await store.fetchSettings()
    await refresh()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(settings.value).toEqual({ showLoginLink: true })
  })
})
