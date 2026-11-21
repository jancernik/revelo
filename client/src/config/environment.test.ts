import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ config: vi.fn(), existsSync: vi.fn(() => false) }))

vi.mock("dotenv", () => ({ default: { config: mocks.config } }))
vi.mock("fs", () => ({ default: { existsSync: mocks.existsSync } }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv("API_PORT", undefined)
  vi.stubEnv("CLIENT_PORT", undefined)
  vi.stubEnv("NODE_ENV", "development")
  mocks.existsSync.mockReturnValue(false)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("environment config", () => {
  it("uses numeric default ports without an environment file", async () => {
    const { config } = await import("#src/config/environment")
    expect(config).toEqual({
      API_BASE_URL: "http://localhost:3000",
      API_PORT: 3000,
      CLIENT_PORT: 5173
    })
    expect(mocks.config).not.toHaveBeenCalled()
  })

  it("preserves configured port strings", async () => {
    vi.stubEnv("API_PORT", "4000")
    vi.stubEnv("CLIENT_PORT", "5190")
    const { config } = await import("#src/config/environment")
    expect(config).toEqual({
      API_BASE_URL: "http://localhost:4000",
      API_PORT: "4000",
      CLIENT_PORT: "5190"
    })
  })

  it("uses the relative API path in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { config } = await import("#src/config/environment")
    expect(config.API_BASE_URL).toBe("/api")
  })

  it("loads an existing environment file quietly", async () => {
    mocks.existsSync.mockReturnValue(true)
    await import("#src/config/environment")
    expect(mocks.config).toHaveBeenCalledExactlyOnceWith({
      path: expect.stringMatching(/\.env\.dev$/),
      quiet: true
    })
  })
})
