import type { Image, ImageVersion, ImageVersionType } from "#src/types/models"

export const debounce = function <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay = 1000
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(...args), delay)
  }
}

export const clamp = (value: number, minValue: number, maxValue: number) => {
  return Math.min(Math.max(value, minValue), maxValue)
}

export const lerp = (startValue: number, endValue: number, interpolationFactor: number) => {
  return startValue * (1 - interpolationFactor) + endValue * interpolationFactor
}

/** Converts a smoothing factor tuned per frame at `referenceFps` to one for `deltaTime` seconds. */
export const smoothingFactor = (perFrameFactor: number, deltaTime: number, referenceFps = 60) => {
  if (perFrameFactor >= 1) return 1
  if (perFrameFactor <= 0) return 0
  const rate = -Math.log(1 - perFrameFactor) * referenceFps
  return 1 - Math.exp(-rate * deltaTime)
}

const isFillCallback = <T>(fill: ((index: number) => T) | T): fill is (index: number) => T =>
  typeof fill === "function"

export function createArray<T>(length: number, fillCallback: (index: number) => T): T[]
export function createArray<T>(length: number, fillValue: T): T[]
export function createArray<T>(length: number, fillValueOrCallback: ((index: number) => T) | T) {
  if (isFillCallback(fillValueOrCallback)) {
    return Array.from({ length }, (_, index) => fillValueOrCallback(index))
  }
  return Array.from({ length }, () => fillValueOrCallback)
}

export const clearArray = (array: unknown[]) => {
  array.length = 0
}

export const easeInOutSine = (progress: number) => {
  return 0.5 - 0.5 * Math.cos(Math.PI * progress)
}

export const getImageVersion = (
  imageObject: Partial<Image> = {},
  type: ImageVersionType
): Partial<ImageVersion> => {
  return imageObject.versions?.find((v) => v.type === type) || {}
}

export const getThumbnailPath = (imageObject: Partial<Image> = {}) => {
  return getImageVersion(imageObject, "thumbnail")?.path || ""
}
