import { gsap } from "gsap"

import { useDevice } from "#src/composables/useDevice"
import { useSettings } from "#src/composables/useSettings"

const TARGET_FPS = 75

export function useAdaptiveFrameRate() {
  const { isTouchPrimary } = useDevice()
  const { settings } = useSettings()

  let lastProcessedTimestamp = 0

  const isEnabled = () => settings.value.capFrameRate && isTouchPrimary.value

  const init = () => {
    if (isEnabled()) gsap.ticker.fps(TARGET_FPS)
  }

  const shouldSkipFrame = (timestamp) => {
    if (!isEnabled()) return false
    if (lastProcessedTimestamp > 0 && timestamp - lastProcessedTimestamp < 1000 / TARGET_FPS) {
      return true
    }
    lastProcessedTimestamp = timestamp
    return false
  }

  return { init, shouldSkipFrame }
}
