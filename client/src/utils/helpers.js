export const debounce = function (callback, delay = 1000) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => callback(...args), delay)
  }
}

export const lerp = (a, b, t) => a * (1 - t) + b * t

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
