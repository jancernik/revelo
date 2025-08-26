export const debounce = function (callback, delay = 1000) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(...args), delay)
  }
}

export const groupImages = (images = [], numberOfGroups) => {
  if (images.length === 0) return []
  if (!numberOfGroups || numberOfGroups <= 0) return images

  const imagesWithWeights = images.map((image) => {
    const imageData = image?.versions?.find((v) => v.type === "regular") || {}
    const height = imageData.height || 0
    const width = imageData.width || 0
    const aspectRatio = width > 0 ? height / width : 0
    const weight = parseFloat(aspectRatio.toFixed(3))

    return { ...image, _weight: weight }
  })

  imagesWithWeights.sort((a, b) => b._weight - a._weight)

  const groups = Array.from({ length: numberOfGroups }, () => [])
  const weightTrack = Array.from({ length: numberOfGroups }, () => 0)

  imagesWithWeights.forEach((image) => {
    const index = weightTrack.indexOf(Math.min(...weightTrack))
    const { _weight, ...cleanImage } = image
    weightTrack[index] = parseFloat((weightTrack[index] + _weight).toFixed(3))
    groups[index].push(cleanImage)
  })

  return groups
}

export const lerp = (value1, value2, factor) => value1 * (1 - factor) + value2 * factor
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
export const roundDecimal = (value, places = 0) => Number(value.toFixed(places))
