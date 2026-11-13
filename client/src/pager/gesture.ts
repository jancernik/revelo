import type { GestureConfig } from "./config"
import type { Axis, Direction, Point } from "./types"

import { lockAxis } from "./motion"

export interface PointerHandlers {
  /** The finger moved `distance` pixels along the locked axis since the grab, positive toward the next item. */
  onDrag(distance: number, point: Point, time: number): void
  onGrab(point: Point, time: number): void
  /** The drag left the slop radius along `axis`. Returns the axis to track, or null to ignore the drag. */
  onLock(axis: Axis): Axis | null
  onRelease(point: Point, time: number): void
}

export type StepHandler = (axis: Axis, direction: Direction) => void

interface Active {
  axis: Axis | null
  id: number
  ignored: boolean
  origin: Point
  start: Point
}

/**
 * Turns one pointer at a time into a drag along a locked axis. Points are
 * relative to the element. Other pointers are ignored while one is down.
 */
export function bindPointer(
  element: HTMLElement,
  handlers: PointerHandlers,
  config: () => GestureConfig
): () => void {
  let active: Active | null = null

  const local = (event: PointerEvent, origin: Point): Point => ({
    x: event.clientX - origin.x,
    y: event.clientY - origin.y
  })

  const down = (event: PointerEvent) => {
    if (active || (event.pointerType === "mouse" && event.button !== 0)) return
    const rect = element.getBoundingClientRect()
    const origin = { x: rect.left, y: rect.top }
    const point = local(event, origin)
    active = { axis: null, id: event.pointerId, ignored: false, origin, start: point }
    element.setPointerCapture?.(event.pointerId)
    handlers.onGrab(point, event.timeStamp)
  }

  const move = (event: PointerEvent) => {
    if (active?.id !== event.pointerId || active.ignored) return
    const point = local(event, active.origin)
    const dx = active.start.x - point.x
    const dy = active.start.y - point.y
    if (!active.axis) {
      const axis = lockAxis(dx, dy, config().slop)
      if (!axis) return
      const locked = handlers.onLock(axis)
      if (!locked) {
        active.ignored = true
        return
      }
      active.axis = locked
    }
    handlers.onDrag(active.axis === "y" ? dy : dx, point, event.timeStamp)
  }

  const up = (event: PointerEvent) => {
    if (active?.id !== event.pointerId) return
    const point = local(event, active.origin)
    active = null
    handlers.onRelease(point, event.timeStamp)
  }

  const block = (event: Event) => event.preventDefault()

  element.addEventListener("pointerdown", down)
  element.addEventListener("pointermove", move)
  element.addEventListener("pointerup", up)
  element.addEventListener("pointercancel", up)
  element.addEventListener("lostpointercapture", up)
  element.addEventListener("contextmenu", block)
  return () => {
    element.removeEventListener("pointerdown", down)
    element.removeEventListener("pointermove", move)
    element.removeEventListener("pointerup", up)
    element.removeEventListener("pointercancel", up)
    element.removeEventListener("lostpointercapture", up)
    element.removeEventListener("contextmenu", block)
    if (active && element.hasPointerCapture?.(active.id)) element.releasePointerCapture(active.id)
    active = null
  }
}

const KEYS: Record<string, [Axis, Direction]> = {
  ArrowDown: ["y", 1],
  ArrowLeft: ["x", -1],
  ArrowRight: ["x", 1],
  ArrowUp: ["y", -1],
  PageDown: ["y", 1],
  PageUp: ["y", -1]
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName))

/** Arrow and page keys on `target` step the pager, unless something editable has focus. */
export function bindKeyboard(target: HTMLElement | Window, onStep: StepHandler): () => void {
  const onKeyDown = (event: Event) => {
    const move = event instanceof KeyboardEvent && KEYS[event.key]
    if (
      !move ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing ||
      isEditable(event.target)
    )
      return
    event.preventDefault()
    onStep(...move)
  }
  target.addEventListener("keydown", onKeyDown)
  return () => target.removeEventListener("keydown", onKeyDown)
}

/** Wheel travel that triggers a step, and the pause, in milliseconds, that ends a wheel gesture. */
const WHEEL = { gap: 150, line: 16, step: 40 }

/**
 * One step per wheel gesture along its dominant axis. A gesture is a run of
 * wheel events without a pause, whether one mouse notch or a trackpad flick,
 * and Shift turns a vertical wheel sideways.
 */
export function bindWheel(element: HTMLElement, onStep: StepHandler): () => void {
  let last = -Infinity
  let stepped = false
  const travel = { x: 0, y: 0 }
  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey) return
    event.preventDefault()
    const now = event.timeStamp
    if (now - last > WHEEL.gap) {
      stepped = false
      travel.x = 0
      travel.y = 0
    }
    last = now
    if (stepped) return
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? WHEEL.line
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? WHEEL.step
          : 1
    const sideways = event.shiftKey && event.deltaX === 0
    travel.x += (sideways ? event.deltaY : event.deltaX) * unit
    travel.y += (sideways ? 0 : event.deltaY) * unit
    const axis: Axis = Math.abs(travel.x) > Math.abs(travel.y) ? "x" : "y"
    const delta = travel[axis]
    if (Math.abs(delta) < WHEEL.step) return
    stepped = true
    onStep(axis, Math.sign(delta) as Direction)
  }
  element.addEventListener("wheel", onWheel, { passive: false })
  return () => element.removeEventListener("wheel", onWheel)
}
