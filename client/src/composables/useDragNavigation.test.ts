import { gsap } from "gsap"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"

import type { Image } from "#src/types/models"

import { useDragNavigation } from "#src/composables/useDragNavigation"
import { image } from "#src/stores/test/helpers"

const next = image({ id: "next" })
const previous = image({ id: "previous" })

const timeline = () => {
  const value = gsap.timeline({ paused: true })
  value.to({ position: 0 }, { duration: 1, position: 1 })
  vi.spyOn(value, "play").mockReturnValue(value)
  vi.spyOn(value, "reverse").mockReturnValue(value)
  return value
}

const setup = () => {
  const state = {
    hasCollection: ref(true),
    isAnimating: ref(false),
    isMobileLayout: ref(false),
    metadataVisible: ref(false),
    windowWidth: ref(900)
  }
  const nextImage = ref<Image | null>(next)
  const previousImage = ref<Image | null>(previous)
  const createSlideTimeline = vi.fn<(target: Image, direction: -1 | 1) => gsap.core.Timeline>(() =>
    timeline()
  )
  const navigation = useDragNavigation({
    ...state,
    createSlideTimeline,
    getNextImage: () => nextImage.value,
    getPreviousImage: () => previousImage.value
  })
  return { createSlideTimeline, navigation, nextImage, previousImage, state }
}
type Setup = ReturnType<typeof setup>

const surface = document.createElement("div")
surface.innerHTML = `
  <img class="image">
  <div class="backdrop"></div>
  <button><span class="label"></span></button>
  <div class="floating-controls"><span class="control"></span></div>
  <div class="image-metadata"><span class="field"></span></div>
  <div class="collection-images"><img class="image strip"><span class="thumb"></span></div>
`
const element = (selector: string) => {
  const found = surface.querySelector(selector)
  if (!found) throw new Error(`Missing ${selector}`)
  return found
}

const withTouches = <E extends Event>(event: E, clientX?: number) => {
  Object.defineProperty(event, "touches", {
    value: clientX === undefined ? [] : [{ clientX }]
  })
  return event
}

const start = (
  { navigation }: Setup,
  clientX: number,
  { cancelable = true, target = ".backdrop", touch = false } = {}
) => {
  const event = touch
    ? withTouches(new TouchEvent("touchstart", { bubbles: true, cancelable }), clientX)
    : new MouseEvent("mousedown", { bubbles: true, cancelable, clientX })
  if (touch) surface.addEventListener("touchstart", navigation.handleDragStart, { once: true })
  else surface.addEventListener("mousedown", navigation.handleDragStart, { once: true })
  element(target).dispatchEvent(event)
  return event
}

const move = async ({ navigation }: Setup, clientX?: number, touch = false) => {
  const event = touch
    ? withTouches(new TouchEvent("touchmove", { cancelable: true }), clientX)
    : new MouseEvent("mousemove", { cancelable: true, clientX })
  await navigation.handleDragMove(event)
  return event
}

const end = ({ navigation }: Setup) => {
  const event = new MouseEvent("mouseup", { cancelable: true })
  navigation.handleDragEnd(event)
  return event
}

const required = <T>(value: null | T | undefined) => {
  if (value === null || value === undefined) throw new Error("Missing value")
  return value
}

// 900px wide windows map 600px of drag to a full slide.
const progressFor = (pixels: number) => pixels / 600

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("useDragNavigation", () => {
  describe("starting a drag", () => {
    it("starts from the mouse position and blocks the native drag", () => {
      const context = setup()
      const event = start(context, 400)
      expect(context.navigation.isDragging.value).toBe(true)
      expect(event.defaultPrevented).toBe(true)
    })

    it("starts from the first touch and keeps native touch handling on the image", () => {
      const context = setup()
      const event = start(context, 400, { target: ".image", touch: true })
      expect(context.navigation.isDragging.value).toBe(true)
      expect(event.defaultPrevented).toBe(false)
    })

    it("blocks native touch handling outside the image when allowed", () => {
      const context = setup()
      expect(start(context, 400, { touch: true }).defaultPrevented).toBe(true)
      expect(start(setup(), 400, { cancelable: false, touch: true }).defaultPrevented).toBe(false)
    })

    it.each([".label", ".control", ".field", ".thumb"])(
      "ignores presses inside interactive areas (%s)",
      (target) => {
        const context = setup()
        const event = start(context, 400, { target })
        expect(context.navigation.isDragging.value).toBe(false)
        expect(event.defaultPrevented).toBe(false)
      }
    )

    it("still drags from an image inside an interactive area", () => {
      const context = setup()
      start(context, 400, { target: ".strip" })
      expect(context.navigation.isDragging.value).toBe(true)
    })

    it("ignores presses while the mobile metadata panel is open", () => {
      const context = setup()
      context.state.metadataVisible.value = true
      context.state.isMobileLayout.value = true
      const event = start(context, 400)
      expect(context.navigation.isDragging.value).toBe(false)
      expect(event.defaultPrevented).toBe(false)
      context.state.isMobileLayout.value = false
      start(context, 400)
      expect(context.navigation.isDragging.value).toBe(true)
    })

    it.each([
      ["the viewer is animating", true, true],
      ["there is no collection", false, false]
    ])("blocks the native drag but does not start while %s", (_, animating, collection) => {
      const context = setup()
      context.state.isAnimating.value = animating
      context.state.hasCollection.value = collection
      const event = start(context, 400)
      expect(event.defaultPrevented).toBe(true)
      expect(context.navigation.isDragging.value).toBe(false)
    })
  })

  describe("dragging", () => {
    it("waits for more than 10px of movement before sliding", async () => {
      const context = setup()
      start(context, 500)
      const still = await move(context, 490)
      expect(context.navigation.hasDragMovement.value).toBe(false)
      expect(still.defaultPrevented).toBe(false)
      expect(context.createSlideTimeline).not.toHaveBeenCalled()

      const moved = await move(context, 489)
      expect(context.navigation.hasDragMovement.value).toBe(true)
      expect(moved.defaultPrevented).toBe(true)
      expect(context.createSlideTimeline).toHaveBeenCalledWith(next, 1)
      const right = required(context.navigation.rightTransitionTimeline.value)
      expect(right.progress()).toBeCloseTo(progressFor(11))
    })

    it("slides towards the previous image when dragging right", async () => {
      const context = setup()
      start(context, 100)
      await move(context, 220)
      expect(context.createSlideTimeline).toHaveBeenCalledWith(previous, -1)
      expect(context.navigation.rightTransitionTimeline.value).toBeNull()
      const left = required(context.navigation.leftTransitionTimeline.value)
      expect(left.progress()).toBeCloseTo(progressFor(120))
    })

    it("follows touches", async () => {
      const context = setup()
      start(context, 300, { touch: true })
      const event = await move(context, 150, true)
      expect(event.defaultPrevented).toBe(true)
      const right = required(context.navigation.rightTransitionTimeline.value)
      expect(right.progress()).toBeCloseTo(progressFor(150))
    })

    it("stops short of completing the slide", async () => {
      const context = setup()
      start(context, 890)
      await move(context, 0)
      expect(context.navigation.rightTransitionTimeline.value?.progress()).toBe(0.99)
    })

    it("creates each direction's timeline once and resets the other side", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 400)
      await move(context, 380)
      const right = required(context.navigation.rightTransitionTimeline.value)
      await move(context, 560)
      const left = required(context.navigation.leftTransitionTimeline.value)
      expect(context.createSlideTimeline).toHaveBeenCalledTimes(2)
      expect(right.progress()).toBe(0)
      expect(left.progress()).toBeCloseTo(progressFor(60))
      await move(context, 440)
      expect(context.createSlideTimeline).toHaveBeenCalledTimes(2)
      expect(left.progress()).toBe(0)
      expect(right.progress()).toBeCloseTo(progressFor(60))
      await move(context, 500)
      expect(left.progress()).toBe(0)
      expect(right.progress()).toBe(0)
    })

    it("does nothing without a neighbouring image", async () => {
      const context = setup()
      context.nextImage.value = null
      start(context, 500)
      await move(context, 300)
      expect(context.createSlideTimeline).not.toHaveBeenCalled()
      expect(context.navigation.rightTransitionTimeline.value).toBeNull()
    })

    it("ignores moves without a drag or a position", async () => {
      const context = setup()
      await move(context, 100)
      expect(context.navigation.hasDragMovement.value).toBe(false)
      start(context, 500, { touch: true })
      const event = await move(context, undefined, true)
      expect(event.defaultPrevented).toBe(false)
      expect(context.navigation.hasDragMovement.value).toBe(false)
    })

    it("keeps blocking scrolling but stops sliding while an image switch runs", async () => {
      const context = setup()
      start(context, 500)
      context.navigation.isSwitchingImage.value = true
      const event = await move(context, 300)
      expect(event.defaultPrevented).toBe(true)
      expect(context.createSlideTimeline).not.toHaveBeenCalled()
    })
  })

  describe("releasing", () => {
    it("commits a slide past 10% progress", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 400)
      const right = required(context.navigation.rightTransitionTimeline.value)
      context.navigation.slideProgress.value = 0.1
      const event = end(context)
      expect(event.defaultPrevented).toBe(true)
      expect(right.play).toHaveBeenCalledOnce()
      expect(right.reverse).not.toHaveBeenCalled()
      expect(context.navigation.isSwitchingImage.value).toBe(true)
      expect(context.navigation.isDragging.value).toBe(false)
    })

    it("commits a slide towards the previous image", async () => {
      const context = setup()
      start(context, 400)
      await move(context, 500)
      const left = required(context.navigation.leftTransitionTimeline.value)
      context.navigation.slideProgress.value = -0.4
      end(context)
      expect(left.play).toHaveBeenCalledOnce()
    })

    it("reverts a slide below 10% progress", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 450)
      const right = required(context.navigation.rightTransitionTimeline.value)
      context.navigation.slideProgress.value = 0.09
      end(context)
      expect(right.reverse).toHaveBeenCalledOnce()
      expect(right.play).not.toHaveBeenCalled()
      expect(context.navigation.isSwitchingImage.value).toBe(true)
    })

    it("leaves the switch flag set when released at zero with only the next timeline", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 450)
      const right = required(context.navigation.rightTransitionTimeline.value)
      context.navigation.slideProgress.value = 0
      end(context)
      expect(right.play).not.toHaveBeenCalled()
      expect(right.reverse).not.toHaveBeenCalled()
      vi.advanceTimersByTime(0)
      expect(context.navigation.isSwitchingImage.value).toBe(true)
    })

    it("clears the movement flag after the click that follows the release", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 450)
      end(context)
      expect(context.navigation.hasDragMovement.value).toBe(true)
      vi.advanceTimersByTime(0)
      expect(context.navigation.hasDragMovement.value).toBe(false)
    })

    it("ends a drag without timelines quietly", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 495)
      const event = end(context)
      expect(event.defaultPrevented).toBe(false)
      expect(context.navigation.isDragging.value).toBe(false)
      expect(context.navigation.isSwitchingImage.value).toBe(false)
    })

    it("ignores releases without a drag", () => {
      const context = setup()
      const event = end(context)
      expect(event.defaultPrevented).toBe(false)
      expect(context.navigation.isSwitchingImage.value).toBe(false)
    })

    it("lets a running switch finish and clears its flag on the next tick", async () => {
      const context = setup()
      start(context, 500)
      await move(context, 300)
      const right = required(context.navigation.rightTransitionTimeline.value)
      context.navigation.isSwitchingImage.value = true
      end(context)
      expect(right.play).not.toHaveBeenCalled()
      expect(context.navigation.isDragging.value).toBe(false)
      expect(context.navigation.isSwitchingImage.value).toBe(true)
      vi.advanceTimersByTime(0)
      expect(context.navigation.isSwitchingImage.value).toBe(false)
    })
  })

  describe("interrupting a running slide", () => {
    const interrupted = (progress: number) => {
      const context = setup()
      const right = timeline()
      const left = timeline()
      const paused = [vi.spyOn(right, "paused"), vi.spyOn(left, "paused")]
      context.navigation.rightTransitionTimeline.value = right
      context.navigation.leftTransitionTimeline.value = left
      context.navigation.slideProgress.value = progress
      context.navigation.isSwitchingImage.value = true
      start(context, 500)
      return { context, left, paused, right }
    }

    it("pauses both timelines and takes over the switch", () => {
      const { context, paused } = interrupted(0.5)
      for (const spy of paused) expect(spy).toHaveBeenCalledWith(true)
      expect(context.navigation.isSwitchingImage.value).toBe(false)
      expect(context.navigation.isDragging.value).toBe(true)
    })

    it("continues the next slide from its progress", async () => {
      const { context, right } = interrupted(0.5)
      await move(context, 440)
      expect(right.progress()).toBeCloseTo(0.5 + progressFor(60))
      await move(context, 620)
      expect(right.progress()).toBeCloseTo(0.5 - progressFor(120))
      await move(context, -1000)
      expect(right.progress()).toBe(0.99)
    })

    it("continues the previous slide from its progress", async () => {
      const { context, left } = interrupted(-0.5)
      await move(context, 560)
      expect(left.progress()).toBeCloseTo(0.5 + progressFor(60))
    })

    it("turns to the other side once dragged more than 10% back past the start", async () => {
      const { context, left, right } = interrupted(0.05)
      await move(context, 560)
      expect(right.progress()).toBe(0)
      await move(context, 500)
      expect(right.progress()).toBeCloseTo(0.05)
      await move(context, 561)
      expect(right.progress()).toBe(0)
      await move(context, 620)
      expect(context.createSlideTimeline).not.toHaveBeenCalled()
      expect(left.progress()).toBeCloseTo(progressFor(120))
    })

    it("creates the other side's timeline when it is missing", async () => {
      const context = setup()
      const right = timeline()
      context.navigation.rightTransitionTimeline.value = right
      context.navigation.slideProgress.value = 0.2
      start(context, 500)
      await move(context, 500 + 400)
      expect(context.createSlideTimeline).toHaveBeenCalledWith(previous, -1)
      await move(context, 500 + 420)
      const left = required(context.navigation.leftTransitionTimeline.value)
      expect(left.progress()).toBeCloseTo(progressFor(420))
    })

    it("treats an interrupted slide at rest like a fresh drag", async () => {
      const { context, right } = interrupted(0)
      await move(context, 380)
      expect(right.progress()).toBeCloseTo(progressFor(120))
    })
  })
})
