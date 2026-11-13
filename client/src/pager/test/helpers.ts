import { vi } from "vitest"

import type { Renderer, SlideSource } from "../render/types"

export const source = (count = 6): SlideSource => ({
  count,
  get: (index) => (index >= 0 && index < count ? { aspect: 1, image: null } : undefined)
})

export const renderer = () => ({
  dispose: vi.fn<Renderer["dispose"]>(),
  render: vi.fn<Renderer["render"]>(),
  resize: vi.fn<Renderer["resize"]>()
})

export function browser() {
  let now = 0
  let id = 0
  const frames = new Map<number, FrameRequestCallback>()
  const media = Object.assign(new EventTarget(), { matches: false })
  const disconnect = vi.fn()
  const observe = vi.fn()
  let resize: () => void = () => {}
  vi.stubGlobal("matchMedia", () => media)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = disconnect
      observe = observe
      constructor(callback: () => void) {
        resize = callback
      }
    }
  )
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key))
  vi.spyOn(performance, "now").mockImplementation(() => now)
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(10, 20, 600, 800)
  )
  const frame = (ms = 1000 / 60) => {
    now += ms
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) callback(now)
  }
  return {
    disconnect,
    flush() {
      for (let i = 0; i < 1200 && frames.size; i++) frame()
      if (frames.size) throw new Error("Frame loop did not become idle")
    },
    frame,
    frames,
    media,
    observe,
    resize: () => resize()
  }
}
