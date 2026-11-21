import type { AxiosAdapter, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios"

import { AxiosError } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiFailure } from "#src/types/api"

const auth = vi.hoisted(() => {
  let accessToken: null | string | undefined = null
  return {
    get accessToken() {
      return accessToken
    },
    set accessToken(value: null | string | undefined) {
      accessToken = value
    },
    clearUser: vi.fn<() => void>(),
    logout: vi.fn<() => Promise<void>>(),
    refreshToken: vi.fn<() => Promise<void>>()
  }
})

vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))

let api: AxiosInstance
const adapter = vi.fn<AxiosAdapter>()

const reply = <T>(
  config: InternalAxiosRequestConfig<unknown>,
  data: T,
  status = 200
): AxiosResponse<T> => ({
  config,
  data,
  headers: {},
  status,
  statusText: status === 200 ? "OK" : "Error"
})

const failure = (config: InternalAxiosRequestConfig<unknown>, status?: number, code?: string) => {
  const body: ApiFailure = { data: null, status: "fail" }
  return new AxiosError(
    status ? `Request failed with status code ${status}` : "Network Error",
    code,
    config,
    undefined,
    status === undefined ? undefined : reply(config, body, status)
  )
}

const token = (payload: unknown) => `header.${btoa(String(JSON.stringify(payload)))}.signature`
const validToken = (seconds = 600) => token({ exp: Date.now() / 1000 + seconds })
const gate = () => {
  let resolve = () => {}
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"))
  vi.resetModules()
  auth.accessToken = null
  auth.clearUser.mockReset().mockImplementation(() => {
    auth.accessToken = null
  })
  auth.logout.mockReset().mockResolvedValue(undefined)
  auth.refreshToken.mockReset().mockResolvedValue(undefined)
  adapter.mockReset().mockImplementation(async (config) => reply(config, { ok: true }))
  api = (await import("#src/utils/api")).default
  api.defaults.adapter = adapter
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("API authorization", () => {
  it("keeps the API base URL and credential settings", () => {
    expect(api.defaults.baseURL).toBe("/api")
    expect(api.defaults.withCredentials).toBe(true)
  })

  it("adds Authorization for a non-expiring token without refreshing", async () => {
    const current = validToken()
    auth.accessToken = current
    await api.get("/images")
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${current}`)
    expect(auth.refreshToken).not.toHaveBeenCalled()
  })

  it("leaves authorization absent without a token", async () => {
    await api.get("/images")
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBeUndefined()
    expect(auth.refreshToken).not.toHaveBeenCalled()
  })

  it.each([0, 30, 60])("refreshes a token expiring in %s seconds", async (seconds) => {
    auth.accessToken = validToken(seconds)
    const refreshed = validToken(3600)
    auth.refreshToken.mockImplementation(async () => {
      auth.accessToken = refreshed
    })
    await api.get("/images")
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${refreshed}`)
  })

  it("deduplicates proactive refresh across concurrent requests", async () => {
    auth.accessToken = validToken(30)
    const pending = gate()
    const refreshed = validToken(3600)
    auth.refreshToken.mockImplementation(async () => {
      await pending.promise
      auth.accessToken = refreshed
    })
    const requests = Promise.all([api.get("/images"), api.get("/collections")])
    await vi.advanceTimersByTimeAsync(0)
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
    expect(adapter).not.toHaveBeenCalled()
    pending.resolve()
    await requests
    expect(adapter).toHaveBeenCalledTimes(2)
    for (const [config] of adapter.mock.calls) {
      expect(config.headers.get("Authorization")).toBe(`Bearer ${refreshed}`)
    }
  })

  it("uses the captured old token when proactive refresh fails", async () => {
    const current = validToken(30)
    auth.accessToken = current
    auth.refreshToken.mockRejectedValue(new Error("Refresh failed"))
    await api.get("/images")
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${current}`)
    expect(auth.clearUser).not.toHaveBeenCalled()
  })

  it("skips expiry checks for refresh requests but still decorates them", async () => {
    const current = validToken(30)
    auth.accessToken = current
    await api.post("/refresh")
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${current}`)
    expect(auth.refreshToken).not.toHaveBeenCalled()
  })

  it.each([
    "malformed",
    "header.?.signature",
    token(null),
    `header.${btoa("invalid json")}.signature`
  ])("clears auth for an unreadable token %s", async (current) => {
    auth.accessToken = current
    await api.get("/images")
    expect(auth.clearUser).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBeUndefined()
  })

  it("preserves numeric-string expiry coercion", async () => {
    const current = token({ exp: String(Date.now() / 1000 + 600) })
    auth.accessToken = current
    await api.get("/images")
    expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${current}`)
    expect(auth.refreshToken).not.toHaveBeenCalled()
    expect(auth.clearUser).not.toHaveBeenCalled()
  })

  it.each([{}, 42, "payload"])(
    "retains a readable payload without an expiry: %j",
    async (payload) => {
      const current = token(payload)
      auth.accessToken = current
      await api.get("/images")
      expect(adapter.mock.calls[0]?.[0].headers.get("Authorization")).toBe(`Bearer ${current}`)
      expect(auth.refreshToken).not.toHaveBeenCalled()
      expect(auth.clearUser).not.toHaveBeenCalled()
    }
  )
})

describe("API 401 handling", () => {
  it("refreshes and retries once using the updated token", async () => {
    const current = validToken()
    const refreshed = validToken(3600)
    auth.accessToken = current
    auth.refreshToken.mockImplementation(async () => {
      auth.accessToken = refreshed
    })
    const authorization: unknown[] = []
    adapter.mockImplementation(async (config) => {
      authorization.push(config.headers.get("Authorization"))
      if (authorization.length === 1) throw failure(config, 401)
      return reply(config, { ok: true })
    })
    await api.get("/images")
    expect(authorization).toEqual([`Bearer ${current}`, `Bearer ${refreshed}`])
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it("rejects the second 401 without another refresh or logout", async () => {
    adapter.mockImplementation(async (config) => {
      throw failure(config, 401)
    })
    await expect(api.get("/images")).rejects.toMatchObject({ response: { status: 401 } })
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it.each(["/login", "/signup", "/verify-email", "/verification-pending"])(
    "does not refresh a 401 from %s",
    async (path) => {
      adapter.mockImplementation(async (config) => {
        throw failure(config, 401)
      })
      await expect(api.post(path)).rejects.toMatchObject({ response: { status: 401 } })
      expect(adapter).toHaveBeenCalledTimes(1)
      expect(auth.refreshToken).not.toHaveBeenCalled()
      expect(auth.logout).not.toHaveBeenCalled()
    }
  )

  it.each(["/logout", "/resend-verification"])("still retries a 401 from %s", async (path) => {
    let attempts = 0
    adapter.mockImplementation(async (config) => {
      if (++attempts === 1) throw failure(config, 401)
      return reply(config, { ok: true })
    })
    await api.post(path)
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
  })

  it("logs out and rejects with the refresh error when refresh fails", async () => {
    const error = new Error("Refresh rejected")
    auth.refreshToken.mockRejectedValue(error)
    adapter.mockImplementation(async (config) => {
      throw failure(config, 401)
    })
    await expect(api.get("/images")).rejects.toBe(error)
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it("deduplicates refresh for concurrent 401 responses", async () => {
    const pending = gate()
    const paths = new Set<string>()
    auth.refreshToken.mockImplementation(() => pending.promise)
    adapter.mockImplementation(async (config) => {
      const path = config.url ?? ""
      if (!paths.has(path)) {
        paths.add(path)
        throw failure(config, 401)
      }
      return reply(config, { ok: true })
    })
    const requests = Promise.all([api.get("/images"), api.get("/collections")])
    await vi.advanceTimersByTimeAsync(0)
    expect(auth.refreshToken).toHaveBeenCalledTimes(1)
    pending.resolve()
    await requests
    expect(adapter).toHaveBeenCalledTimes(4)
  })

  it.each([401, 503])("logs out on refresh-route failure %s without retrying", async (status) => {
    adapter.mockImplementation(async (config) => {
      throw failure(config, status)
    })
    await expect(api.post("/refresh")).rejects.toMatchObject({ response: { status } })
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(auth.refreshToken).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledTimes(1)
  })
})

describe("API transient retries", () => {
  it.each([
    { name: "no response" },
    { code: AxiosError.ERR_NETWORK, name: "network error" },
    { code: AxiosError.ECONNABORTED, name: "timeout", status: 400 },
    { code: AxiosError.ERR_NETWORK, name: "network code with response", status: 400 },
    { name: "bad gateway", status: 502 },
    { name: "unavailable", status: 503 },
    { name: "gateway timeout", status: 504 }
  ])("retries $name five times with exponential backoff", async ({ code, status }) => {
    const started = Date.now()
    const attempts: number[] = []
    adapter.mockImplementation(async (config) => {
      attempts.push(Date.now() - started)
      throw failure(config, status, code)
    })
    const rejected = expect(api.get("/images")).rejects.toBeInstanceOf(AxiosError)
    await vi.advanceTimersByTimeAsync(0)
    expect(adapter).toHaveBeenCalledTimes(1)
    let count = 1
    for (const delay of [1000, 2000, 4000, 8000, 16000]) {
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(adapter).toHaveBeenCalledTimes(count)
      await vi.advanceTimersByTimeAsync(1)
      expect(adapter).toHaveBeenCalledTimes(++count)
    }
    await rejected
    await vi.advanceTimersByTimeAsync(60_000)
    expect(adapter).toHaveBeenCalledTimes(6)
    expect(attempts).toEqual([0, 1000, 3000, 7000, 15000, 31000])
  })

  it("recovers from a transient failure while retaining method and body", async () => {
    const sent: { data: unknown; method?: string; url?: string }[] = []
    adapter.mockImplementation(async (config) => {
      sent.push({ data: config.data, method: config.method, url: config.url })
      if (sent.length === 1) throw failure(config, 503)
      return reply(config, { ok: true })
    })
    const request = api.post("/images", { name: "Photo" })
    await vi.advanceTimersByTimeAsync(1000)
    await request
    expect(sent).toEqual([
      { data: '{"name":"Photo"}', method: "post", url: "/images" },
      { data: '{"name":"Photo"}', method: "post", url: "/images" }
    ])
  })

  it.each([400, 403, 404, 500])("does not retry ordinary HTTP %s errors", async (status) => {
    adapter.mockImplementation(async (config) => {
      throw failure(config, status)
    })
    await expect(api.get("/images")).rejects.toMatchObject({ response: { status } })
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(auth.refreshToken).not.toHaveBeenCalled()
  })

  it("rejects an error without request config without retrying", async () => {
    const error = new AxiosError("Network Error", AxiosError.ERR_NETWORK)
    adapter.mockRejectedValue(error)
    await expect(api.get("/images")).rejects.toBe(error)
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(auth.logout).not.toHaveBeenCalled()
    expect(auth.refreshToken).not.toHaveBeenCalled()
  })
})
