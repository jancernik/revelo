import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent } from "vue"

import { useFavicon } from "#src/composables/useFavicon"

const hosts = new Set<{ unmount: () => void }>()
let media = Object.assign(new EventTarget(), { matches: false })

const host = () => {
  const wrapper = mount(
    defineComponent({
      setup() {
        useFavicon()
        return () => null
      }
    })
  )
  hosts.add(wrapper)
  return wrapper
}

beforeEach(() => {
  document.head.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove())
  media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media)
  )
})

afterEach(() => {
  for (const wrapper of hosts) wrapper.unmount()
  hosts.clear()
  document.head.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("useFavicon", () => {
  it("creates a relative light favicon when none exists", () => {
    host()
    const link = document.head.querySelector("link[rel~='icon']")
    expect(link?.getAttribute("rel")).toBe("icon")
    expect(link?.getAttribute("href")).toBe("images/favicon-light.svg")
  })

  it("updates an existing favicon using the initial dark preference", () => {
    const existing = document.createElement("link")
    existing.rel = "shortcut icon"
    existing.href = "old.svg"
    document.head.appendChild(existing)
    media.matches = true
    host()
    expect(document.head.querySelectorAll("link[rel~='icon']")).toHaveLength(1)
    expect(document.head.querySelector("link[rel~='icon']")).toBe(existing)
    expect(existing.getAttribute("href")).toBe("images/favicon-dark.svg")
  })

  it("switches the favicon when the media preference changes", () => {
    host()
    media.matches = true
    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }))
    expect(document.head.querySelector("link[rel~='icon']")?.getAttribute("href")).toBe(
      "images/favicon-dark.svg"
    )
    media.matches = false
    media.dispatchEvent(Object.assign(new Event("change"), { matches: false }))
    expect(document.head.querySelector("link[rel~='icon']")?.getAttribute("href")).toBe(
      "images/favicon-light.svg"
    )
  })

  it("removes the media listener on unmount", () => {
    const remove = vi.spyOn(media, "removeEventListener")
    const wrapper = host()
    wrapper.unmount()
    hosts.delete(wrapper)
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function))
    media.matches = true
    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }))
    expect(document.head.querySelector("link[rel~='icon']")?.getAttribute("href")).toBe(
      "images/favicon-light.svg"
    )
  })
})
