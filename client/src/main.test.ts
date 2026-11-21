import { expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  app: { mount: vi.fn(), use: vi.fn() },
  collections: { initialize: vi.fn<() => Promise<void>>() },
  images: { initialize: vi.fn<() => Promise<void>>() },
  pinia: {},
  router: {},
  settings: { initialize: vi.fn<() => Promise<void>>() }
}))

vi.mock("pinia", () => ({ createPinia: () => mocks.pinia }))
vi.mock("vue", () => ({ createApp: () => mocks.app }))
vi.mock("#src/App.vue", () => ({ default: {} }))
vi.mock("#src/router", () => ({ default: mocks.router }))
vi.mock("#src/stores/collections", () => ({ useCollectionsStore: () => mocks.collections }))
vi.mock("#src/stores/images", () => ({ useImagesStore: () => mocks.images }))
vi.mock("#src/stores/settings", () => ({ useSettingsStore: () => mocks.settings }))

it("mounts after settings initialize without waiting for image or collection loading", async () => {
  let finishSettings = () => {}
  const settingsReady = new Promise<void>((resolve) => {
    finishSettings = resolve
  })
  mocks.settings.initialize.mockReturnValue(settingsReady)
  mocks.collections.initialize.mockReturnValue(new Promise(() => {}))
  mocks.images.initialize.mockReturnValue(new Promise(() => {}))

  await import("#src/main")

  expect(mocks.app.use.mock.calls).toEqual([[mocks.pinia], [mocks.router]])
  expect(mocks.settings.initialize).toHaveBeenCalledTimes(1)
  expect(mocks.collections.initialize).toHaveBeenCalledTimes(1)
  expect(mocks.images.initialize).toHaveBeenCalledTimes(1)
  expect(mocks.app.mount).not.toHaveBeenCalled()

  finishSettings()
  await settingsReady

  expect(mocks.app.mount).toHaveBeenCalledExactlyOnceWith("#app")
})
