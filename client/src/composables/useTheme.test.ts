import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import type { GalleryHandle } from "#src/components/images/types"

import { composableProbe } from "#src/test/composableProbe"

interface MaskOptions {
  duration: number
  ease: string
  onComplete: () => void
  onUpdate: () => void
  radius: number
}

const animation = vi.hoisted(() => ({
  init: vi.fn(),
  kill: vi.fn(),
  to: vi.fn<(target: { radius: number }, options: MaskOptions) => { kill: () => void }>()
}))
vi.mock("gsap", () => ({ gsap: { to: animation.to } }))
vi.mock("#src/composables/useAdaptiveFrameRate", () => ({
  useAdaptiveFrameRate: () => ({ init: animation.init })
}))

enableAutoUnmount(afterEach)
let media: EventTarget & { matches: boolean }
beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  vi.useFakeTimers()
  localStorage.clear()
  document.body.innerHTML = ""
  document.body.style.pointerEvents = ""
  document.documentElement.className = "light unrelated"
  media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media)
  )
  vi.stubGlobal("innerWidth", 800)
  vi.stubGlobal("innerHeight", 600)
  animation.to.mockReturnValue({ kill: animation.kill })
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
  document.documentElement.className = ""
  localStorage.clear()
})

const setup = async () => {
  const { useTheme } = await import("#src/composables/useTheme")
  let state: ReturnType<typeof useTheme> | undefined
  const wrapper = mount(composableProbe(useTheme, (value) => (state = value)))
  if (!state) throw new Error("Missing theme state")
  return { state, wrapper }
}

const changeSystem = (matches: boolean) => {
  media.matches = matches
  media.dispatchEvent(Object.assign(new Event("change"), { matches }))
}

const mask = () => {
  const call = animation.to.mock.calls[0]
  if (!call) throw new Error("Missing animation")
  return { options: call[1], target: call[0] }
}

const gallery = ({ auto = false, optional = true, paused = false } = {}) => {
  const order: string[] = []
  let settle: () => void = () => {}
  const handle: GalleryHandle = {
    isScrollPaused: () => paused,
    onSettle: (callback) => {
      order.push("onSettle")
      settle = () => {
        order.push("settle")
        callback()
      }
    },
    pauseScrolling: () => {
      order.push("pause")
      paused = true
    },
    resumeScrolling: () => {
      order.push("resume")
      paused = false
    },
    startAutoScroll: () => order.push("startAuto"),
    stopAutoScroll: () => order.push("stopAuto")
  }
  if (optional) {
    handle.isAutoScrollActive = () => auto
    handle.queueAutoScrollResume = () => order.push("queueAuto")
  }
  return { handle, order, settle: () => settle() }
}

describe("useTheme", () => {
  it.each(["light", "dark", "custom"])("reads the saved %s preference", async (saved) => {
    localStorage.setItem("theme", saved)
    const { state } = await setup()
    expect(state.theme.value).toBe(saved)
    expect(state.themeClass.value).toBe(saved)
    expect(animation.init).toHaveBeenCalledOnce()
  })

  it.each([false, true])("uses the initial system preference: dark %s", async (dark) => {
    media.matches = dark
    const { state } = await setup()
    expect(state.theme.value).toBe("system")
    expect(state.themeClass.value).toBe(dark ? "dark" : "light")
  })

  it("tracks system changes only for system mode and removes its listener on unmount", async () => {
    const { state, wrapper } = await setup()
    changeSystem(true)
    expect(state.themeClass.value).toBe("dark")
    await state.setTheme("dark")
    changeSystem(false)
    expect(state.themeClass.value).toBe("dark")
    await state.setTheme("system", { animate: false })
    expect(state.themeClass.value).toBe("light")
    expect(localStorage.getItem("theme")).toBe("system")
    wrapper.unmount()
    changeSystem(true)
    expect(state.themeClass.value).toBe("light")
  })

  it("shares state and gallery registration across callers", async () => {
    const first = await setup()
    const { useTheme } = await import("#src/composables/useTheme")
    let second: ReturnType<typeof useTheme> | undefined
    mount(composableProbe(useTheme, (value) => (second = value)))
    if (!second) throw new Error("Missing second caller")
    expect(second.theme).toBe(first.state.theme)
    const fake = gallery({ paused: true })
    second.registerImageGallery(fake.handle)
    await first.state.setTheme("dark", { animate: false })
    expect(fake.order).toEqual(["resume", "queueAuto"])
  })

  it("persists an equivalent preference without touching the gallery or DOM", async () => {
    const { state } = await setup()
    const fake = gallery()
    state.registerImageGallery(fake.handle)
    await state.setTheme("light")
    expect(state.theme.value).toBe("light")
    expect(localStorage.getItem("theme")).toBe("light")
    expect(fake.order).toEqual([])
    expect(animation.to).not.toHaveBeenCalled()
    expect(document.body.style.pointerEvents).toBe("")
  })

  it("pauses, waits for settle, animates, persists, resumes and queues in order", async () => {
    const { state } = await setup()
    const fake = gallery()
    state.registerImageGallery(fake.handle)
    const persist = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      fake.order.push("persist")
    })
    animation.to.mockImplementation(() => {
      fake.order.push("animate")
      return { kill: animation.kill }
    })
    const pending = state.setTheme("dark", { origin: { x: 0, y: 0 } })
    expect(fake.order).toEqual(["stopAuto", "pause", "onSettle"])
    expect(state.isWaitingForGallery.value).toBe(true)
    expect(animation.to).not.toHaveBeenCalled()
    fake.settle()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.isWaitingForGallery.value).toBe(false)
    expect(fake.order).toEqual(["stopAuto", "pause", "onSettle", "settle", "animate"])
    expect(state.theme.value).toBe("system")
    mask().options.onComplete()
    await pending
    expect(fake.order).toEqual([
      "stopAuto",
      "pause",
      "onSettle",
      "settle",
      "animate",
      "persist",
      "resume",
      "queueAuto"
    ])
    expect(persist).toHaveBeenCalledWith("theme", "dark")
    expect(state.themeClass.value).toBe("dark")
  })

  it("stops and restarts active auto-scroll without pause or settling", async () => {
    const { state } = await setup()
    const fake = gallery({ auto: true })
    state.registerImageGallery(fake.handle)
    const pending = state.setTheme("dark")
    await nextTick()
    expect(fake.order).toEqual(["stopAuto"])
    mask().options.onComplete()
    await pending
    expect(fake.order).toEqual(["stopAuto", "startAuto", "queueAuto"])
  })

  it("resumes an already paused gallery and tolerates absent optional members", async () => {
    const { state } = await setup()
    const fake = gallery({ optional: false, paused: true })
    state.registerImageGallery(fake.handle)
    await state.setTheme("dark", { animate: false })
    expect(fake.order).toEqual(["resume"])
    state.registerImageGallery(null)
    await state.setTheme("light", { animate: false })
    expect(fake.order).toEqual(["resume"])
  })

  it("blocks reentry during setup but clears isAnimating before the tween finishes (quirk)", async () => {
    const { state } = await setup()
    const pending = state.setTheme("dark")
    expect(state.isAnimating.value).toBe(true)
    await state.setTheme("light", { animate: false })
    expect(localStorage.getItem("theme")).toBeNull()
    await nextTick()
    expect(animation.to).toHaveBeenCalledOnce()
    expect(state.isAnimating.value).toBe(false)
    expect(document.querySelector(".theme-transition-clone")).not.toBeNull()
    mask().options.onComplete()
    await pending
    expect(localStorage.getItem("theme")).toBe("dark")
  })

  it("clones a clean tree, preserves scroll offsets and animates the mask from its origin", async () => {
    const { state } = await setup()
    document.body.innerHTML = `<main data-v-test v-cloak><div class="scrollable"><p>Leaf</p></div><script>ignored</script><i data-v-inspector>ignored</i><div class="vue-portal-target">ignored</div><div id="__vue-devtools-container__"></div><div id="vue-devtools-container"></div><svg data-v-svg><path d="M0 0" /></svg></main>`
    const scroller = document.querySelector(".scrollable")
    if (!scroller) throw new Error("Missing scroller")
    scroller.scrollTop = 72
    const pending = state.setTheme("dark", { origin: { x: 0, y: 0 } })
    expect(document.body.style.pointerEvents).toBe("none")
    expect(document.documentElement.classList.contains("no-transition")).toBe(true)
    await nextTick()
    const clone = document.querySelector(".theme-transition-clone")
    expect(clone?.classList.contains("dark")).toBe(true)
    expect(clone?.querySelector(".scrollable")?.scrollTop).toBe(72)
    expect(clone?.querySelector("p")?.textContent).toBe("Leaf")
    expect(
      clone?.querySelector(
        "[data-v-test], [v-cloak], script, [data-v-inspector], .vue-portal-target, [id*='devtools']"
      )
    ).toBeNull()
    expect(clone?.querySelector("svg")?.hasAttribute("data-v-svg")).toBe(false)
    expect(mask().options).toMatchObject({ duration: 1.5, ease: "power2.inOut", radius: 1000 })
    mask().target.radius = 25
    mask().options.onUpdate()
    expect(clone instanceof HTMLElement && clone.style.mask).toContain(
      "circle at 0px 0px, black 25px, black 25px, transparent 26px"
    )
    mask().options.onComplete()
    await pending
    expect(document.querySelector(".theme-transition-clone")).toBeNull()
    expect(document.documentElement.className).toContain("unrelated")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    await vi.advanceTimersByTimeAsync(19)
    expect(document.body.style.pointerEvents).toBe("none")
    await vi.advanceTimersByTimeAsync(1)
    expect(document.body.style.pointerEvents).toBe("all")
    expect(document.documentElement.classList.contains("no-transition")).toBe(false)
  })

  it("defaults the mask origin to the viewport centre and finishes on resize", async () => {
    const { state } = await setup()
    const pending = state.setTheme("dark")
    await nextTick()
    expect(mask().options.radius).toBe(500)
    const clone = document.querySelector(".theme-transition-clone")
    expect(clone instanceof HTMLElement && clone.style.mask).toContain("circle at 400px 300px")
    window.dispatchEvent(new Event("resize"))
    await pending
    expect(animation.kill).toHaveBeenCalledOnce()
    expect(document.querySelector(".theme-transition-clone")).toBeNull()
    expect(localStorage.getItem("theme")).toBe("dark")
    window.dispatchEvent(new Event("resize"))
    expect(animation.kill).toHaveBeenCalledOnce()
  })

  it("disables transitions for a non-animated switch and restores input after 20ms", async () => {
    const { state } = await setup()
    const pending = state.setTheme("dark", { animate: false })
    expect(document.body.style.pointerEvents).toBe("none")
    expect(state.theme.value).toBe("system")
    await pending
    expect(animation.to).not.toHaveBeenCalled()
    expect(state.themeClass.value).toBe("dark")
    expect(localStorage.getItem("theme")).toBe("dark")
    expect(document.documentElement.classList.contains("no-transition")).toBe(true)
    await vi.advanceTimersByTimeAsync(19)
    expect(document.body.style.pointerEvents).toBe("none")
    await vi.advanceTimersByTimeAsync(1)
    expect(document.body.style.pointerEvents).toBe("all")
    expect(document.documentElement.classList.contains("no-transition")).toBe(false)
  })

  it("rejects a tween creation error without cleanup or persistence (quirk)", async () => {
    const { state } = await setup()
    const error = new Error("Animation unavailable")
    animation.to.mockImplementation(() => {
      throw error
    })
    await expect(state.setTheme("dark")).rejects.toBe(error)
    expect(document.querySelector(".theme-transition-clone")).not.toBeNull()
    expect(document.documentElement.classList.contains("no-transition")).toBe(true)
    expect(document.body.style.pointerEvents).toBe("none")
    expect(state.isAnimating.value).toBe(false)
    expect(localStorage.getItem("theme")).toBeNull()
    window.dispatchEvent(new Event("resize"))
  })

  it("cleans up and persists after a synchronous cloning error", async () => {
    const { state } = await setup()
    const error = new Error("Cloning unavailable")
    vi.spyOn(document.body, "cloneNode").mockImplementation(() => {
      throw error
    })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    await state.setTheme("dark")
    expect(log).toHaveBeenCalledWith("Theme transition error:", error)
    expect(document.querySelector(".theme-transition-clone")).toBeNull()
    expect(document.documentElement.classList.contains("no-transition")).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.body.style.pointerEvents).toBe("all")
    expect(state.isAnimating.value).toBe(false)
    expect(localStorage.getItem("theme")).toBe("dark")
  })
})
