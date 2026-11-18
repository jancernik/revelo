import { describe, expect, it, vi } from "vitest"

describe("test environment setup", () => {
  it("provides a non-matching media query with change events", () => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = vi.fn()
    expect(media).toBeInstanceOf(EventTarget)
    expect(media.matches).toBe(false)
    expect(media.media).toBe("(prefers-color-scheme: dark)")
    media.addEventListener("change", listener)
    media.dispatchEvent(new Event("change"))
    expect(listener).toHaveBeenCalledTimes(1)
    media.removeEventListener("change", listener)
    media.dispatchEvent(new Event("change"))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("provides object URL creation and revocation", () => {
    const url = URL.createObjectURL(new Blob(["image"]))
    expect(url).toMatch(/^blob:/)
    expect(() => URL.revokeObjectURL(url)).not.toThrow()
  })
})
