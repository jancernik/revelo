export const cssVar = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}

export const debounce = function (callback, delay = 1000) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(...args), delay)
  }
}

export const clamp = (value, minValue, maxValue) => {
  return Math.min(Math.max(value, minValue), maxValue)
}

export const lerp = (startValue, endValue, interpolationFactor) => {
  return startValue * (1 - interpolationFactor) + endValue * interpolationFactor
}

export const createArray = (length, fillValueOrCallback) => {
  if (typeof fillValueOrCallback === "function") {
    return Array.from({ length }, (_, index) => fillValueOrCallback(index))
  }
  return Array.from({ length }, () => fillValueOrCallback)
}

export const clearArray = (array) => {
  array.length = 0
}

export const easeInOutSine = (progress) => {
  return 0.5 - 0.5 * Math.cos(Math.PI * progress)
}
