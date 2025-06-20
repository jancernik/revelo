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

const getElementCenter = (element) => {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

const getLinearDistance = (p1, p2) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

export const orderElementsByDistance = (elements, referenceElement) => {
  const referenceCenter = getElementCenter(referenceElement)

  return Array.from(elements).sort((a, b) => {
    const centerA = getElementCenter(a)
    const centerB = getElementCenter(b)

    const distanceA = getLinearDistance(centerA, referenceCenter)
    const distanceB = getLinearDistance(centerB, referenceCenter)

    return distanceA - distanceB
  })
}

export const cssVar = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name)
}
