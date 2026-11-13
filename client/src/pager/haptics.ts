export interface Haptics {
  /** Releases resources owned by this haptic implementation. */
  dispose?(): void
  /** A short tick, for a step landing or committing. */
  tick(): void
}

export const silentHaptics: Haptics = {
  tick() {}
}

const VIBRATION_MS = 8

/** Haptics through the vibration API, or iOS Safari's switch toggle where there is none. */
export function createHaptics(): Haptics {
  let label: HTMLLabelElement | null = null
  return {
    dispose() {
      label?.remove()
      label = null
    },
    tick() {
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(VIBRATION_MS)
        return
      }
      label ??= createSwitch()
      label.click()
    }
  }
}

// iOS Safari 18+ plays a haptic when a switch-style checkbox toggles; there is no vibration API.
function createSwitch(): HTMLLabelElement {
  const label = document.createElement("label")
  label.ariaHidden = "true"
  label.style.display = "none"
  const input = document.createElement("input")
  input.type = "checkbox"
  input.setAttribute("switch", "")
  label.append(input)
  document.body.append(label)
  return label
}
