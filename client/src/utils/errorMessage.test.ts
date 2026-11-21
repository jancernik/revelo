import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it } from "vitest"

import type { ApiFailure } from "#src/types/api"

import { errorMessage } from "#src/utils/api"

const fromBody = (data: ApiFailure) => {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError("Axios message", undefined, config, undefined, {
    config,
    data,
    headers: {},
    status: 400,
    statusText: "Bad Request"
  })
}

describe("errorMessage", () => {
  it("prefers the response body's message", () => {
    expect(errorMessage(fromBody({ message: "Server message", status: "error" }))).toBe(
      "Server message"
    )
  })

  it("falls back to the Axios message for operational failures", () => {
    expect(errorMessage(fromBody({ data: null, status: "fail" }))).toBe("Axios message")
    expect(
      errorMessage(
        fromBody({ data: { validation: [{ message: "Invalid email" }] }, status: "fail" })
      )
    ).toBe("Axios message")
  })

  it("falls back when the server message is empty", () => {
    expect(errorMessage(fromBody({ message: "", status: "error" }))).toBe("Axios message")
  })

  it("uses the Axios message without a response", () => {
    expect(errorMessage(new AxiosError("Offline", AxiosError.ERR_NETWORK))).toBe("Offline")
  })

  it("uses an ordinary Error's message", () => {
    expect(errorMessage(new Error("Unexpected failure"))).toBe("Unexpected failure")
  })

  it.each(["offline", 42, null, undefined, { reason: "offline" }])(
    "stringifies a non-Error value %j",
    (value) => {
      expect(errorMessage(value)).toBe(String(value))
    }
  )
})
