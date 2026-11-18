import { vi } from "vitest"

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn((media: string) => Object.assign(new EventTarget(), { matches: false, media })),
  writable: true
})

URL.createObjectURL = vi.fn(() => "blob:test")
URL.revokeObjectURL = vi.fn()
