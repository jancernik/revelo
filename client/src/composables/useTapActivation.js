// Touch devices stop a native momentum scroll with the first tap and swallow its click, so menu
// controls activate on pointer release instead of waiting for the click.
const TAP_SLOP_PX = 10
const TAP_MAX_HOLD_MS = 500

export function useTapActivation() {
  let tapStart = null
  let clickSuppressionPending = false

  const noteTapStart = (event) => {
    clickSuppressionPending = false
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

    clickSuppressionPending = true
    activate()
  }

  const shouldSkipClick = () => {
    if (!clickSuppressionPending) return false
    clickSuppressionPending = false
    return true
  }

  return { activateOnTap, noteTapStart, shouldSkipClick }
}
