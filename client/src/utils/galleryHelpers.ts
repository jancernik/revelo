import type { Image, ImageVersion, ImageVersionType } from "#src/types/models"

export interface AnimationProgress {
  progress: number
  started: boolean
}

export interface GroupImagesOptions {
  preserveOrder?: boolean
}

export interface Point {
  x: number
  y: number
}

export const getImageVersion = (
  imageObject: null | Partial<Image> = {},
  type: ImageVersionType
): Partial<ImageVersion> => {
  return imageObject?.versions?.find((v) => v.type === type) || {}
}

export const calculateImageAspectRatio = (imageObject: null | Partial<Image> = {}) => {
  const imageData = getImageVersion(imageObject, "regular")
  const height = imageData.height || 0
  const width = imageData.width || 0
  const aspectRatio = height > 0 ? width / height : 0
  return Number(aspectRatio.toFixed(3))
}

/** Callers pass a positive group count; without one the input list is returned ungrouped. */
export function groupImages(
  images: Image[] | undefined,
  groupCount: number,
  options?: GroupImagesOptions
): Image[][]
export function groupImages(
  images: Image[] = [],
  groupCount: number,
  options: GroupImagesOptions = {}
): Image[] | Image[][] {
  if (!Array.isArray(images) || images.length === 0) return []
  if (!groupCount || groupCount <= 0) return images

  const { preserveOrder = false } = options

  const imagesWithWeights = images.map((image) => {
    const weight = calculateImageAspectRatio(image)
    return { ...image, _weight: weight }
  })

  if (!preserveOrder) {
    imagesWithWeights.sort((a, b) => b._weight - a._weight)
  }

  const groups = Array.from({ length: groupCount }, (): Image[] => [])
  const totals = Array.from({ length: groupCount }, () => 0)

  for (const { _weight: weight, ...image } of imagesWithWeights) {
    const index = totals.indexOf(Math.min(...totals))
    totals[index] = Number((totals[index] + weight).toFixed(3))
    groups[index].push(image)
  }

  return groups
}

export const elementCenter = (element: Element): Point => {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

export const calculateDistance = (point1: Point, point2: Point) => {
  const deltaX = point2.x - point1.x
  const deltaY = point2.y - point1.y
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

export const sortStatesByDistance = <State extends { element: Element }>(
  imageStates: State[],
  referencePoint: Point,
  ascending = true
) => {
  return imageStates.sort((stateA, stateB) => {
    const centerA = elementCenter(stateA.element)
    const centerB = elementCenter(stateB.element)
    const distanceA = calculateDistance(centerA, referencePoint)
    const distanceB = calculateDistance(centerB, referencePoint)
    return ascending ? distanceA - distanceB : distanceB - distanceA
  })
}

export const calculateAnimationProgress = (
  currentTime: number,
  startTime: number,
  delay: number,
  duration: number
): AnimationProgress => {
  const timeSinceStart = currentTime - startTime - delay
  if (timeSinceStart < 0) return { progress: 0, started: false }

  const rawProgress = timeSinceStart / duration
  const clampedProgress = Math.max(0, Math.min(1, rawProgress))
  return { progress: clampedProgress, started: true }
}

export const interpolateFadeValue = (
  fromValue: number,
  toValue: number,
  progress: number,
  easeFunction?: ((progress: number) => number) | null
) => {
  const easedProgress = easeFunction ? easeFunction(progress) : progress
  return fromValue + (toValue - fromValue) * easedProgress
}
