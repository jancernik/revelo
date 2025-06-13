export const getVisibleElements = (selector) => {
  const elements = document.querySelectorAll(selector)
  return Array.from(elements).filter((element) => {
    const rect = element.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const windowWidth = window.innerWidth

    return (
      rect.bottom >= 0 && rect.top <= windowHeight && rect.right >= 0 && rect.left <= windowWidth
    )
  })
}

export const cssVar = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}
