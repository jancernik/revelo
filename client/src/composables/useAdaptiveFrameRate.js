import { useDevice } from "#src/composables/useDevice"
import { useSettings } from "#src/composables/useSettings"
import { gsap } from "gsap"

const TARGET_FPS = 60
const DETECT_SAMPLES = 20
const MONITOR_SAMPLES = 10
const CHANGE_THRESHOLD = 0.3

export function useAdaptiveFrameRate() {
  const { isTouchPrimary } = useDevice()
  const { settings } = useSettings()

  let refreshRateDetected = false
  let frameSkipRatio = 1
  let frameCounter = 0
  let refreshRateFrameTimes = []
  let monitorFrameTimes = []
  let lastDetectedMedianFrameTime = 0

  const isEnabled = () => settings.value.capFrameRate && isTouchPrimary.value

  const init = () => {
    if (isEnabled()) gsap.ticker.fps(TARGET_FPS)
  }

  const shouldSkipFrame = (timestamp, lastFrameTimestamp) => {
    if (!isEnabled()) return false

    const nativeFrameTime = timestamp - lastFrameTimestamp

    if (nativeFrameTime > 0 && nativeFrameTime < 50) {
      if (!refreshRateDetected) {
        refreshRateFrameTimes.push(nativeFrameTime)
      } else {
        monitorFrameTimes.push(nativeFrameTime)
        if (monitorFrameTimes.length > MONITOR_SAMPLES) monitorFrameTimes.shift()
      }
    }

    if (!refreshRateDetected) {
      if (refreshRateFrameTimes.length >= DETECT_SAMPLES) {
        const sorted = [...refreshRateFrameTimes].sort((a, b) => a - b)
        lastDetectedMedianFrameTime = sorted[Math.floor(sorted.length / 2)]
        const detectedRate = Math.round(1000 / lastDetectedMedianFrameTime)
        frameSkipRatio = Math.max(1, Math.round(detectedRate / TARGET_FPS))
        refreshRateDetected = true
      }
      frameCounter++
      return frameCounter % 2 !== 0
    }

    if (monitorFrameTimes.length >= MONITOR_SAMPLES) {
      const sorted = [...monitorFrameTimes].sort((a, b) => a - b)
      const currentMedian = sorted[Math.floor(sorted.length / 2)]
      const change =
        Math.abs(currentMedian - lastDetectedMedianFrameTime) / lastDetectedMedianFrameTime

      if (change > CHANGE_THRESHOLD) {
        lastDetectedMedianFrameTime = currentMedian
        const recalibratedRate = Math.round(1000 / currentMedian)
        frameSkipRatio = Math.max(1, Math.round(recalibratedRate / TARGET_FPS))
        frameCounter = 0
        monitorFrameTimes = []
      }
    }

    if (frameSkipRatio > 1) {
      frameCounter++
      return frameCounter % frameSkipRatio !== 0
    }

    return false
  }

  return { init, shouldSkipFrame }
}
