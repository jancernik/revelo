// Touch devices stop a native momentum scroll with the first tap and swallow its click, so menu
// controls activate on pointer release instead of waiting for the click.
const TAP_SLOP_PX = 10
const TAP_MAX_HOLD_MS = 500
const CLICK_SUPPRESS_MS = 350

export function useTapActivation() {
  let tapStart = null
  let lastTapActivationAt = -CLICK_SUPPRESS_MS

  const noteTapStart = (event) => {
    if (event.pointerType === "mouse") return

    tapStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      startedAt: performance.now()
    }
  }

  const activateOnTap = (event, activate) => {
    if (event.pointerType === "mouse") return

    const start = tapStart
    tapStart = null
    if (!start || start.pointerId !== event.pointerId) return

    const moved = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY)
    if (moved > TAP_SLOP_PX) return
    if (performance.now() - start.startedAt > TAP_MAX_HOLD_MS) return

    lastTapActivationAt = performance.now()
    activate()
  }

  const shouldSkipClick = () => performance.now() - lastTapActivationAt < CLICK_SUPPRESS_MS

  return { activateOnTap, noteTapStart, shouldSkipClick }
}
