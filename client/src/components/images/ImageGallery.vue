<script setup>
import EmptyGalleryState from "#src/components/images/EmptyGalleryState.vue"
import ImageCard from "#src/components/images/ImageCard.vue"
import Loading from "#src/components/Loading.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useImagesStore } from "#src/stores/images"
import {
  calculateAnimationProgress,
  elementCenter,
  groupImages,
  interpolateFadeValue,
  sortStatesByDistance
} from "#src/utils/galleryHelpers"
import { clamp, clearArray, createArray, easeInOutSine, lerp } from "#src/utils/helpers"
import { gsap } from "gsap"
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue"
import { useRoute } from "vue-router"

const SPACING_BASE = 20 // Space between images and columns in pixels
const SPACING_SMALL = 8 // Space between images and columns in pixels for small screens
const VIRTUAL_BUFFER = 200 // Buffer area outside viewport for performance optimization
const MAX_COLUMN_WIDTH = 300 // Maximum width of individual columns in pixels
const MIN_COLUMNS = 2 // Minimum number of columns to display
const MAX_COLUMNS = 5 // Maximum number of columns to display
const MAX_WIDTH = 1600 // Maximum width of the gallery area in pixels

const DRAG_FACTOR = 1 // Multiplier for drag sensitivity
const WHEEL_IMPULSE = 5.0 // Scroll wheel velocity multiplier
const DRAG_IMPULSE = 3 // Drag velocity impulse factor
const KEYBOARD_PAGE_IMPULSE = 2.0 // Page up/down and space bar velocity multiplier
const KEYBOARD_ARROW_IMPULSE = 2.0 // Arrow key velocity multiplier
const VELOCITY_DECAY = 4.0 // Rate at which velocity decays over time
const PAUSED_VELOCITY_DECAY = 10.0 // Rate at which velocity decays over time when paused
const MAX_SPEED = 3000 // Maximum scroll velocity in pixels per second
const VELOCITY_THRESHOLD = 4 // Minimum velocity below which scrolling stops
const MAX_SCROLL_DELTA = 80 // Maximum scroll delta per wheel event
const KEY_THROTTLE_DELAY = 100 // Milliseconds between key events

const MAX_SCROLL_LERP = 0.08 // Lerp factor at center column (fastest response)
const MIN_SCROLL_LERP = 0.045 // Lerp factor at outermost columns (slowest response)
const VELOCITY_LERP_FACTOR = 0.35 // Velocity smoothing factor for drag interactions
const TOUCH_LERP_MULTIPLIER = 2.8 // Multiplier for lerp factors on touch devices for more direct feel
const TOUCH_VELOCITY_LERP_FACTOR = 0.8 // Higher velocity lerp for more responsive touch
const MAX_DELTA_TIME = 0.05 // Maximum delta time for frame rate limiting
const MIN_DELTA_TIME = 0.001 // Minimum delta time to prevent division by zero

const ZOOM_DURATION = 0.2 // Duration for images to fade out when zooming to detail view
const ZOOM_TOTAL_DURATION = 0.5 // Total duration for all staggered fade animations to complete

const SHOW_DEBUG_INFO = false // Toggle display of debug information

let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let zoomAnimationEndTimestamp = 0
let zoomAnimationStartTimestamp = 0
let scrollPosition = 0
let dragStartPosition = 0

let columnImageCounts = []
let imageCardData = []
let scrollTargets = []
let columnCountUpdateId = 0
let columnScalableHeights = []
let columnSpacing = []
let columnLerpFactors = []
let columnWrappedHeights = []
let lastResizeFactor = 1
let renderLoopId = 0
let currentVelocityDecay = VELOCITY_DECAY
let isFirstLoad = true
let forceZoomTargetVisibility = false

let isZoomTransitionActive = false
let isZoomingOut = true
let zoomTargetImageId = null
let zoomReferencePoint = null
let lastInputMethod = null
let lastTabDirection = 1
let lastKeyEventTime = 0
let isDraggingWithTouch = false
let currentDragPositionX = 0

const props = defineProps({
  alternatingScroll: {
    default: false,
    type: Boolean
  },
  columns: {
    default: null,
    type: Number
  },
  continuousScroll: {
    default: false,
    type: Boolean
  },
  menuVisible: {
    default: true,
    type: Boolean
  },
  scrollSpeed: {
    default: 20,
    type: Number
  }
})

const { imageData: fullscreenImageData, show: showFullscreenImage } = useFullscreenImage()
const { height: windowHeight, width: windowWidth } = useWindowSize()
const { hide: hideMenu, show: showMenu } = useMenu()
const route = useRoute()
const imagesStore = useImagesStore()
const imageGallery = useTemplateRef("image-gallery")

const imageGroups = ref([])
const loadedImageIds = ref(new Set())
const visibleImageIds = ref(new Set())
const imageCountForInitialLoad = ref(0)
const isDragging = ref(false)
const hasDragged = ref(false)
const baselineColumnWidth = ref(0)
const velocity = ref(0)
const isScrollPaused = ref(true)
const canInfiniteScroll = ref(false)
const isBuildingLayout = ref(false)
const selectedImage = ref(null)
const isAutoScrolling = ref(false)
const autoScrollVelocity = ref(0)
const columnsHeights = ref([])

let userInactivityTimer = null
const USER_INACTIVITY_TIMEOUT = 1500
const maxWindowWidth = computed(() => Math.min(windowWidth.value, MAX_WIDTH))
const noImages = computed(() => imagesStore.filteredImages.length === 0)

const columnCount = computed(() => {
  if (props.columns && props.columns >= MIN_COLUMNS && props.columns <= MAX_COLUMNS) {
    return props.columns
  }
  const base = Math.ceil((maxWindowWidth.value - SPACING_BASE) / (MAX_COLUMN_WIDTH + SPACING_BASE))
  const clamped = clamp(base, MIN_COLUMNS, MAX_COLUMNS)
  if (clamped % 2 === 0 && clamped !== 2) return clamped < MAX_COLUMNS ? clamped + 1 : clamped - 1
  return clamped
})

const currentSpacing = computed(() => (columnCount.value === 2 ? SPACING_SMALL : SPACING_BASE))

const availableWidth = computed(() => {
  return props.columns ? windowWidth.value : maxWindowWidth.value
})

const columnWidth = computed(() => {
  const totalSpacing = currentSpacing.value * 2 + currentSpacing.value * (columnCount.value - 1)
  return (availableWidth.value - totalSpacing) / columnCount.value
})

const galleryWidth = computed(() => {
  return (
    currentSpacing.value * 2 +
    columnCount.value * columnWidth.value +
    currentSpacing.value * (columnCount.value - 1)
  )
})

const centerOffset = computed(() => {
  return Math.max(0, (windowWidth.value - galleryWidth.value) / 2)
})

const firstColumnMargin = computed(() => centerOffset.value + currentSpacing.value)

const resizeFactor = computed(() => {
  return baselineColumnWidth.value === 0 ? 1 : columnWidth.value / baselineColumnWidth.value
})

const initialLoadProgress = computed(() => {
  if (imageCountForInitialLoad.value === 0) return 0
  if (loadedImageIds.value.size >= imageCountForInitialLoad.value) return 1
  return clamp(loadedImageIds.value.size / imageCountForInitialLoad.value, 0, 1)
})

const initialLoadComplete = computed(() => initialLoadProgress.value === 1)

const maxScrollDistance = computed(() => {
  if (canInfiniteScroll.value) return Infinity
  if (columnsHeights.value.length === 0) return 0

  const maxColumnIndex = columnsHeights.value.indexOf(Math.max(...columnsHeights.value))
  const scalableHeight = columnScalableHeights[maxColumnIndex]
  const constantSpacing = columnSpacing[maxColumnIndex]

  const contentHeightOnScreen = scalableHeight * resizeFactor.value + constantSpacing
  const totalHeightOnScreen = contentHeightOnScreen + currentSpacing.value
  const scrollRangeOnScreen = totalHeightOnScreen - windowHeight.value
  const scrollRangeInBaseline = scrollRangeOnScreen / resizeFactor.value

  return Math.max(0, scrollRangeInBaseline)
})

const getBoundedScrollPosition = (targetPosition) => {
  if (canInfiniteScroll.value) return targetPosition
  return clamp(targetPosition, -maxScrollDistance.value, 0)
}

const getFocusTargetInColumn = (columnIndex) => {
  const columnImages = imageCardData.filter((img) => img.columnIndex === columnIndex && img.visible)
  if (columnImages.length === 0) return null

  const viewportCenter = windowHeight.value / 2
  let closestImage = null
  let closestDistance = Infinity

  for (const card of columnImages) {
    if (!card.visible) continue

    const wrappedPosition = calculateWrappedPosition(card)
    const cardHeight = card.cardHeight * resizeFactor.value
    const cardCenter = wrappedPosition + cardHeight / 2
    const distance = Math.abs(cardCenter - viewportCenter)

    if (distance < closestDistance) {
      closestDistance = distance
      closestImage = card
    }
  }

  return closestImage
}

const scrollToImage = (imageId, options = {}) => {
  const { animated = true, force = false } = options
  if (!imageId) return

  const targetCard = imageCardData.find((card) => card.imageId === imageId)
  const rect = targetCard?.element?.getBoundingClientRect()
  if (rect && !force) {
    if (rect.top >= 0 && rect.bottom <= windowHeight.value) {
      return
    }
  }
  if (!targetCard) return

  const constantSpacing = (targetCard.cardIndex + 1) * currentSpacing.value
  const scaledCardTop = (targetCard.cardTop - constantSpacing) * resizeFactor.value
  const scaledVirtualBuffer = (VIRTUAL_BUFFER - 1) * resizeFactor.value
  const adjustedCardTop = scaledCardTop + constantSpacing - scaledVirtualBuffer

  const screenCenter = windowHeight.value / 2
  const cardCenter = adjustedCardTop + (targetCard.cardHeight * resizeFactor.value) / 2
  let targetScrollPosition = -(cardCenter - screenCenter)

  if (canInfiniteScroll.value) {
    const totalSpacing = columnSpacing[targetCard.columnIndex]
    const columnHeight = columnsHeights.value[targetCard.columnIndex]
    const scalableHeight = columnHeight - totalSpacing
    const wrapHeight = scalableHeight + totalSpacing
    const currentPos = scrollPosition
    const scaledTargetPosition = targetScrollPosition / resizeFactor.value

    if (animated) {
      const normalizePosition = (pos) => ((pos % wrapHeight) + wrapHeight) % wrapHeight

      const currentNormalized = normalizePosition(currentPos)
      const targetNormalized = normalizePosition(scaledTargetPosition)

      let backwardDistance, forwardDistance

      if (targetNormalized >= currentNormalized) {
        forwardDistance = targetNormalized - currentNormalized
        backwardDistance = currentNormalized + (wrapHeight - targetNormalized)
      } else {
        forwardDistance = wrapHeight - currentNormalized + targetNormalized
        backwardDistance = currentNormalized - targetNormalized
      }

      if (forwardDistance <= backwardDistance) {
        targetScrollPosition = currentPos + forwardDistance
      } else {
        targetScrollPosition = currentPos - backwardDistance
      }
    } else {
      targetScrollPosition = scaledTargetPosition
    }

    scrollPosition = targetScrollPosition
  } else {
    scrollPosition = getBoundedScrollPosition(targetScrollPosition)
  }

  if (animated) {
    velocity.value = 0
    startRenderLoop()
  } else {
    scrollTargets = scrollTargets.map(() => scrollPosition)
    updateImagePositions()
  }
}

const selectImageHorizontally = (direction = 1) => {
  let targetColumn = 0
  if (!selectedImage.value) {
    targetColumn = direction > 0 ? 0 : columnCount.value - 1
  } else {
    targetColumn = selectedImage.value.columnIndex + direction
    if (targetColumn < 0) targetColumn = 0
    if (targetColumn >= columnCount.value) targetColumn = columnCount.value - 1
  }

  selectedImage.value = getFocusTargetInColumn(targetColumn)

  if (selectedImage.value) {
    selectedImage.value.element?.focus()
    updateImagePositions()
    requestAnimationFrame(() => scrollToImage(selectedImage.value.imageId))
  }
}

const selectImageVertically = (direction = 1) => {
  if (!selectedImage.value) return
  else {
    const columnIndex = selectedImage.value.columnIndex
    const columnImages = imageCardData.filter((img) => img.columnIndex === columnIndex)
    const currentIndex = columnImages.findIndex(
      (img) => img.imageId === selectedImage.value.imageId
    )
    let targetIndex = currentIndex + direction
    if (targetIndex < 0) targetIndex = columnImages.length - 1
    if (targetIndex > columnImages.length - 1) targetIndex = 0
    selectedImage.value = columnImages[targetIndex]
  }

  if (selectedImage.value) {
    selectedImage.value.element?.focus()
    updateImagePositions()
    requestAnimationFrame(() => scrollToImage(selectedImage.value.imageId, { force: true }))
  }
}

const clearImageSelection = () => {
  selectedImage.value = null
  updateImagePositions()
}

const updateImageGroups = () => {
  const groups = groupImages(imagesStore.filteredImages, columnCount.value)
  imageGroups.value = groups.map((group) => gsap.utils.shuffle(group))
}

const calculateImageCardsData = () => {
  columnsHeights.value = createArray(columnCount.value, currentSpacing.value + VIRTUAL_BUFFER - 1)
  columnImageCounts = createArray(columnCount.value, 0)
  clearArray(imageCardData)

  imageGallery.value.querySelectorAll(".gallery-column").forEach((columnElement, columnIndex) => {
    columnElement.querySelectorAll(".image-card").forEach((cardElement, cardIndex) => {
      const img = cardElement.querySelector("img")
      const attrHeight = parseInt(img.getAttribute("height")) || 0
      const attrWidth = parseInt(img.getAttribute("width")) || 1

      const imgHeight = img.naturalHeight || attrHeight
      const imgWidth = img.naturalWidth || attrWidth
      const cardHeight = imgWidth > 0 ? (imgHeight / imgWidth) * columnWidth.value : 0

      imageCardData.push({
        animationDelay: 0,
        cardHeight,
        cardIndex,
        cardTop: columnsHeights.value[columnIndex],
        columnIndex,
        element: cardElement,
        imageId: img.dataset.id,
        setOpacity: gsap.quickSetter(cardElement, "opacity"),
        setScale: (value) => gsap.set(cardElement, { scale: value }),
        setY: gsap.quickSetter(cardElement, "y", "px"),
        visible: false
      })
      columnsHeights.value[columnIndex] += cardHeight + currentSpacing.value
      columnImageCounts[columnIndex]++
    })
    columnsHeights.value[columnIndex] -= currentSpacing.value + VIRTUAL_BUFFER - 1
  })
  const minColumnHeight = Math.min(...columnsHeights.value)
  const viewportHeightInBaselineSpace = windowHeight.value / resizeFactor.value
  canInfiniteScroll.value =
    minColumnHeight - currentSpacing.value >=
    viewportHeightInBaselineSpace + (VIRTUAL_BUFFER * 3) / resizeFactor.value
}

const calculateColumnLerpFactors = () => {
  const centerIndex = (columnCount.value - 1) / 2
  columnLerpFactors = createArray(columnCount.value, (columnIndex) => {
    if (centerIndex === 0) return MAX_SCROLL_LERP

    if (columnCount.value === 2) {
      return columnIndex === 0 ? MAX_SCROLL_LERP * 0.8 : MAX_SCROLL_LERP
    }

    const distanceFromCenter = Math.abs(columnIndex - centerIndex) / centerIndex
    const easedDistance = easeInOutSine(1 - distanceFromCenter)
    return MIN_SCROLL_LERP + (MAX_SCROLL_LERP - MIN_SCROLL_LERP) * easedDistance
  })
}

const calculateColumnDimensions = () => {
  columnScalableHeights = createArray(columnCount.value, (columnIndex) => {
    return columnsHeights.value[columnIndex] - currentSpacing.value * columnImageCounts[columnIndex]
  })
  columnSpacing = createArray(columnCount.value, (columnIndex) => {
    return currentSpacing.value * columnImageCounts[columnIndex]
  })
  columnWrappedHeights = createArray(columnCount.value, 0)
}

const hideAllImages = () => {
  for (const card of imageCardData) {
    card.setY(window.innerHeight * 2)
    card.element.style.visibility = "hidden"
    card.element.style.willChange = "auto"
  }
}

const rebuildLayout = async () => {
  isBuildingLayout.value = true

  await nextTick()
  velocity.value = 0
  scrollTargets = []
  imageCountForInitialLoad.value = 0
  baselineColumnWidth.value = columnWidth.value
  scrollPosition = getBoundedScrollPosition(0)

  await nextTick()
  calculateImageCardsData()
  calculateColumnDimensions()
  calculateColumnLerpFactors()
  initializeScrollTargets()
  hideAllImages()

  requestAnimationFrame(() => {
    isBuildingLayout.value = false
    startRenderLoop()
  })
}

const initializeScrollTargets = () => {
  const previousTargets = scrollTargets
  scrollTargets = createArray(columnCount.value, (columnIndex) => {
    return previousTargets[columnIndex] ?? scrollPosition
  })
}

const assignFadeDelays = (imageCardData, duration = ZOOM_TOTAL_DURATION) => {
  const totalImages = imageCardData.length
  const dynamicStagger = totalImages > 1 ? duration / (totalImages - 1) : 0
  imageCardData.forEach((state, index) => {
    state.animationDelay = index * dynamicStagger * 1000
  })
}

const calculateZoomAnimationTiming = (imageCardData) => {
  const now = performance.now()
  const totalDelay = imageCardData.length
    ? imageCardData[imageCardData.length - 1].animationDelay
    : 0

  return {
    endTime: now + totalDelay + ZOOM_DURATION * 1000,
    startTime: now
  }
}

const startZoomTransition = (imageId, referenceElement) => {
  hideMenu(true)
  zoomTargetImageId = imageId

  zoomReferencePoint = referenceElement
    ? elementCenter(referenceElement)
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const visibleNonTargetStates = imageCardData.filter(
    (state) => state.visible && state.imageId !== imageId
  )

  const sortedStates = sortStatesByDistance(visibleNonTargetStates, zoomReferencePoint, true)
  assignFadeDelays(sortedStates)

  const timing = calculateZoomAnimationTiming(sortedStates)
  zoomAnimationStartTimestamp = timing.startTime
  zoomAnimationEndTimestamp = timing.endTime

  isZoomTransitionActive = true
  isZoomingOut = true
  startRenderLoop()
}

const startZoomReturn = (options = {}) => {
  props.menuVisible && setTimeout(() => showMenu(true), 200)
  const { duration = ZOOM_TOTAL_DURATION, showAllImages = false, withTarget = false } = options

  const visibleNonTargetStates = imageCardData.filter(
    (state) =>
      (state.visible || (showAllImages && state.imageId === zoomTargetImageId)) &&
      (showAllImages || state.imageId !== zoomTargetImageId)
  )

  const referencePoint = withTarget
    ? zoomReferencePoint
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  const sortedStates = sortStatesByDistance(visibleNonTargetStates, referencePoint, false)
  assignFadeDelays(sortedStates, duration)

  const timing = calculateZoomAnimationTiming(sortedStates)
  zoomAnimationStartTimestamp = timing.startTime
  zoomAnimationEndTimestamp = timing.endTime

  zoomReferencePoint = null
  isZoomTransitionActive = true
  isZoomingOut = false
  startRenderLoop()
}

const calculateZoomAnimationValue = (imageCard, now, normalValue, visibleValue, hiddenValue) => {
  if (!isZoomTransitionActive) {
    if (
      zoomTargetImageId &&
      imageCard.imageId !== zoomTargetImageId &&
      !forceZoomTargetVisibility
    ) {
      return hiddenValue
    }
    return normalValue
  }

  const { progress, started } = calculateAnimationProgress(
    now,
    zoomAnimationStartTimestamp,
    imageCard.animationDelay,
    ZOOM_DURATION * 1000
  )

  if (!started) {
    return isZoomingOut ? visibleValue : hiddenValue
  }

  const [fromValue, toValue] = isZoomingOut
    ? [visibleValue, hiddenValue]
    : [hiddenValue, visibleValue]

  return interpolateFadeValue(fromValue, toValue, progress, easeInOutSine)
}

const updateScrollTargets = () => {
  for (let columnIndex = 0; columnIndex < scrollTargets.length; columnIndex++) {
    let lerpFactor = columnLerpFactors[columnIndex] ?? MIN_SCROLL_LERP
    if (isDraggingWithTouch) {
      if (columnCount.value === 2) {
        const columnCenterX =
          firstColumnMargin.value +
          columnIndex * (columnWidth.value + currentSpacing.value) +
          columnWidth.value / 2

        const distanceFromTouch = Math.abs(currentDragPositionX - columnCenterX) / windowWidth.value
        const proximityMultiplier =
          1 + (TOUCH_LERP_MULTIPLIER - 1) * (1 - Math.min(1, distanceFromTouch * 1.3))

        lerpFactor = Math.min(1, lerpFactor * proximityMultiplier)
      } else {
        lerpFactor = Math.min(1, lerpFactor * TOUCH_LERP_MULTIPLIER)
      }
    }
    const shouldReverse = props.alternatingScroll && columnIndex % 2 === 1
    const targetPosition = shouldReverse ? -scrollPosition : scrollPosition
    scrollTargets[columnIndex] = lerp(scrollTargets[columnIndex], targetPosition, lerpFactor)
  }
}

const calculateWrappedPosition = (card) => {
  const constantSpacing = (card.cardIndex + 1) * currentSpacing.value
  const scaledCardTop = (card.cardTop - constantSpacing) * resizeFactor.value
  const scaledScrollTarget = scrollTargets[card.columnIndex] * resizeFactor.value
  const scaledVirtualBuffer = (VIRTUAL_BUFFER - 1) * resizeFactor.value
  const cardPosition = scaledCardTop + constantSpacing + scaledScrollTarget - scaledVirtualBuffer

  if (canInfiniteScroll.value) {
    const minY = -card.cardHeight * resizeFactor.value - scaledVirtualBuffer
    const totalSpacing = columnSpacing[card.columnIndex]
    const columnHeight = columnsHeights.value[card.columnIndex]
    const scalableMaxY = (columnHeight - totalSpacing - card.cardHeight) * resizeFactor.value
    const maxY = scalableMaxY + totalSpacing - scaledVirtualBuffer
    return gsap.utils.wrap(minY, maxY, cardPosition)
  }
  return cardPosition
}

const updateImagePositions = (options = {}) => {
  const { forcePosition = false } = options
  if (isBuildingLayout.value) return

  updateScrollTargets()

  const viewTop = -VIRTUAL_BUFFER
  const viewBottom = windowHeight.value + VIRTUAL_BUFFER
  const now = performance.now()
  const saveInitialLoadImageCount = !imageCountForInitialLoad.value

  for (let columnIndex = 0; columnIndex < columnCount.value; columnIndex++) {
    columnWrappedHeights[columnIndex] =
      columnScalableHeights[columnIndex] * resizeFactor.value + columnSpacing[columnIndex]
  }

  for (const card of imageCardData) {
    if (columnWrappedHeights[card.columnIndex] <= 0) continue
    const wrappedPosition = calculateWrappedPosition(card)
    const scaledCardHeight = card.cardHeight * resizeFactor.value
    const cardBottom = wrappedPosition + scaledCardHeight
    const isVisible = cardBottom >= viewTop && wrappedPosition <= viewBottom

    if (
      isVisible &&
      visibleImageIds.value.size < imageCardData.length &&
      !visibleImageIds.value.has(card.imageId)
    ) {
      visibleImageIds.value.add(card.imageId)
    }

    if (initialLoadComplete.value) {
      if (isVisible && (!card.visible || forceZoomTargetVisibility)) {
        card.visible = true
        card.element.style.visibility = "visible"
        card.element.style.willChange = "transform"
      } else if (!isVisible && card.visible) {
        card.visible = false
        card.element.style.visibility = "hidden"
        card.element.style.willChange = "auto"
      }
    }

    if (isVisible) {
      if (forcePosition) {
        card.setY(wrappedPosition)
      } else if (
        ((!isZoomTransitionActive || card.imageId !== zoomTargetImageId) &&
          !(fullscreenImageData.value && card.imageId === fullscreenImageData.value.id)) ||
        forceZoomTargetVisibility
      ) {
        const targetOpacity = calculateZoomAnimationValue(card, now, 1, 1, 0)
        const targetScale = calculateZoomAnimationValue(card, now, 1, 1, 0.8)
        card.setOpacity(targetOpacity)
        card.setScale(targetScale)
        card.setY(wrappedPosition)
      }
    }
  }
  if (saveInitialLoadImageCount) {
    imageCountForInitialLoad.value = visibleImageIds.value.size
  }
}

const startAutoScroll = () => {
  if (!props.continuousScroll) return
  isAutoScrolling.value = true
  autoScrollVelocity.value = props.scrollSpeed
}

const stopAutoScroll = () => {
  isAutoScrolling.value = false
  autoScrollVelocity.value = 0
}

const resetUserInactivityTimer = () => {
  if (!props.continuousScroll) return

  if (userInactivityTimer) {
    clearTimeout(userInactivityTimer)
  }

  if (isAutoScrolling.value) {
    stopAutoScroll()
  }

  userInactivityTimer = setTimeout(() => {
    startAutoScroll()
  }, USER_INACTIVITY_TIMEOUT)
}

const updateVelocity = (deltaTime) => {
  if (!isBuildingLayout.value && !isDragging.value) {
    const effectiveVelocity = isAutoScrolling.value ? autoScrollVelocity.value : velocity.value

    const newScrollPosition = scrollPosition + effectiveVelocity * deltaTime
    scrollPosition = getBoundedScrollPosition(newScrollPosition)

    if (!isAutoScrolling.value) {
      const velocityDecay = Math.exp(-currentVelocityDecay * deltaTime)
      velocity.value = clamp(velocity.value * velocityDecay, -MAX_SPEED, MAX_SPEED)
      if (Math.abs(velocity.value) < VELOCITY_THRESHOLD) velocity.value = 0
    }
  }
}

const startRenderLoop = () => {
  if (renderLoopId) return
  lastFrameTimestamp = performance.now()
  lastResizeFactor = resizeFactor.value
  renderLoopId = requestAnimationFrame(renderFrame)
}

const stopRenderLoop = () => {
  if (!renderLoopId) return
  cancelAnimationFrame(renderLoopId)
  renderLoopId = 0
  lastFrameTimestamp = 0
}

const updateZoomTransitionState = (timestamp) => {
  if (isZoomTransitionActive && timestamp >= zoomAnimationEndTimestamp) {
    isZoomTransitionActive = false
    if (isZoomingOut) {
      pauseScrolling()
    } else {
      resumeScrolling()
      zoomTargetImageId = null
      forceZoomTargetVisibility = false
      selectedImage.value?.element?.focus()
    }
  }
}

const isRenderLoopIdle = () => {
  if (isBuildingLayout.value || isDragging.value || isZoomTransitionActive) return false

  const scrollTargetsSettled =
    scrollTargets.length === columnCount.value &&
    scrollTargets.every((target) => Math.abs(target - scrollPosition) < 0.5)
  const velocitySettled = Math.abs(velocity.value) < VELOCITY_THRESHOLD
  const resizeFactorStable = Math.abs(resizeFactor.value - lastResizeFactor) < 1e-6
  return scrollTargetsSettled && velocitySettled && resizeFactorStable
}

const renderFrame = (timestamp) => {
  renderLoopId = requestAnimationFrame(renderFrame)

  const deltaTime = Math.min(MAX_DELTA_TIME, (timestamp - (lastFrameTimestamp || timestamp)) / 1000)
  lastFrameTimestamp = timestamp

  updateVelocity(deltaTime)
  updateImagePositions()
  updateZoomTransitionState(timestamp)

  if (isRenderLoopIdle()) stopRenderLoop()
  lastResizeFactor = resizeFactor.value
}

const resumeScrolling = () => {
  isDragging.value = false
  hasDragged.value = false
  isScrollPaused.value = false
  currentVelocityDecay = VELOCITY_DECAY
}

const pauseScrolling = () => {
  isDragging.value = false
  hasDragged.value = false
  isScrollPaused.value = true
  currentVelocityDecay = PAUSED_VELOCITY_DECAY
}

const handleFullscreenReturn = (withTarget, isDifferentImage) => {
  forceZoomTargetVisibility = !!isDifferentImage
  if (zoomTargetImageId) {
    updateImagePositions()
    startZoomReturn({ showAllImages: isDifferentImage, withTarget })
  }
}

const checkImageVisibility = (imageId) => {
  const card = imageCardData.find((card) => card.imageId === imageId)
  return card ? card.visible : false
}

const onFirstLoadComplete = () => {
  isFirstLoad = false
  isScrollPaused.value = false
  updateImagePositions()
  startZoomReturn({ duration: ZOOM_TOTAL_DURATION / 2, withTarget: false })
}

const handleImageClick = (event, image, flipId) => {
  if (zoomTargetImageId) return
  pauseScrolling()
  startZoomTransition(image.id, event.currentTarget)
  showFullscreenImage(image, {
    flipId,
    isThumbnailVisible: () => checkImageVisibility(image.id),
    onReturn: handleFullscreenReturn,
    updatePositions: () => updateImagePositions({ forcePosition: true })
  })
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
}

const handleWheel = (event) => {
  event.preventDefault?.()

  if (isScrollPaused.value) return

  resetUserInactivityTimer()

  let deltaY = 0
  if (event.deltaY !== undefined) {
    deltaY = event.deltaY
  } else if (event.wheelDeltaY !== undefined) {
    deltaY = -event.wheelDeltaY
  } else if (event.wheelDelta !== undefined) {
    deltaY = -event.wheelDelta
  }

  const clampedDelta = clamp(deltaY, -MAX_SCROLL_DELTA, MAX_SCROLL_DELTA)
  scrollPosition -= clampedDelta / resizeFactor.value
  const newScrollPosition = scrollPosition - clampedDelta / resizeFactor.value
  scrollPosition = getBoundedScrollPosition(newScrollPosition)
  velocity.value += clamp(
    (-clampedDelta / resizeFactor.value) * WHEEL_IMPULSE,
    -MAX_SPEED,
    MAX_SPEED
  )
  startRenderLoop()
}

const handleDragStart = (event) => {
  event.preventDefault?.()

  resetUserInactivityTimer()

  isDragging.value = true
  hasDragged.value = false
  isDraggingWithTouch = event.touches !== undefined
  dragStartPosition = event.clientY || event.touches?.[0]?.clientY || 0
  currentDragPositionX = event.clientX || event.touches?.[0]?.clientX || windowWidth.value / 2
  lastDragTimestamp = performance.now()
  velocity.value = 0
  imageGallery.value?.focus()
}

const handleDragMove = (event) => {
  event.preventDefault?.()

  if (!isDragging.value || isScrollPaused.value) return
  const currentY = event.clientY || event.touches?.[0]?.clientY || dragStartPosition
  const deltaY = (currentY - dragStartPosition) * DRAG_FACTOR

  if (Math.abs(deltaY) > 2) hasDragged.value = true

  dragStartPosition = currentY
  if (isDraggingWithTouch) {
    currentDragPositionX = event.touches?.[0]?.clientX || currentDragPositionX
  }
  const newScrollPosition = scrollPosition + deltaY / resizeFactor.value
  scrollPosition = getBoundedScrollPosition(newScrollPosition)

  const now = performance.now()
  const deltaTime = Math.max(MIN_DELTA_TIME, (now - lastDragTimestamp) / 1000)
  lastDragTimestamp = now

  const instantaneousVelocity = ((deltaY / resizeFactor.value) * DRAG_IMPULSE) / deltaTime
  const velocityLerp = isDraggingWithTouch ? TOUCH_VELOCITY_LERP_FACTOR : VELOCITY_LERP_FACTOR
  velocity.value = clamp(
    lerp(velocity.value, instantaneousVelocity, velocityLerp),
    -MAX_SPEED,
    MAX_SPEED
  )
  startRenderLoop()
}

const handleDragEnd = (event) => {
  event.preventDefault?.()

  if (isScrollPaused.value) return
  isDragging.value = false
  isDraggingWithTouch = false
  setTimeout(() => (hasDragged.value = false), 50)
}

const handleWindowPointerDown = (event) => {
  lastInputMethod = event.pointerType
  if (selectedImage.value) {
    clearImageSelection()
  }
}

const handleWindowFocusIn = (event) => {
  if (
    (event.target === imageGallery.value || event.target.tagName === "BODY") &&
    lastInputMethod === "keyboard"
  ) {
    selectImageHorizontally(lastTabDirection)
  }
}

const handleKeyDown = (event) => {
  if (fullscreenImageData.value) return

  switch (event.key) {
    case " ": {
      event.preventDefault()
      if (isScrollPaused.value) break
      if (selectedImage.value) {
        selectedImage.value?.element?.click()
        break
      }

      const scrollDelta = event.shiftKey ? windowHeight.value : -windowHeight.value * 0.6
      scrollPosition += scrollDelta / resizeFactor.value
      velocity.value += clamp(
        (scrollDelta / resizeFactor.value) * KEYBOARD_PAGE_IMPULSE,
        -MAX_SPEED,
        MAX_SPEED
      )
      startRenderLoop()
      break
    }

    case "A":
    case "a":
    case "ArrowLeft": {
      event.preventDefault()
      if (isScrollPaused.value) break
      if (!selectedImage.value) break
      selectImageHorizontally(-1)
      break
    }

    case "ArrowDown":
    case "S":
    case "s": {
      event.preventDefault()
      if (isScrollPaused.value) break

      const now = performance.now()
      if (selectedImage.value && now - lastKeyEventTime < KEY_THROTTLE_DELAY) break
      lastKeyEventTime = now

      if (selectedImage.value) {
        selectImageVertically(1)
        break
      }
      const downDelta = -windowHeight.value * 0.2
      scrollPosition += downDelta / resizeFactor.value
      velocity.value += clamp(
        (downDelta / resizeFactor.value) * KEYBOARD_ARROW_IMPULSE,
        -MAX_SPEED,
        MAX_SPEED
      )
      startRenderLoop()
      break
    }

    case "ArrowRight":
    case "D":
    case "d": {
      event.preventDefault()
      if (isScrollPaused.value) break
      if (!selectedImage.value) break
      selectImageHorizontally(1)
      break
    }

    case "ArrowUp":
    case "W":
    case "w": {
      event.preventDefault()
      if (isScrollPaused.value) break

      const now = performance.now()
      if (selectedImage.value && now - lastKeyEventTime < KEY_THROTTLE_DELAY) break
      lastKeyEventTime = now

      if (selectedImage.value) {
        selectImageVertically(-1)
        break
      }
      const upDelta = windowHeight.value * 0.2
      scrollPosition += upDelta / resizeFactor.value
      velocity.value += clamp(
        (upDelta / resizeFactor.value) * KEYBOARD_ARROW_IMPULSE,
        -MAX_SPEED,
        MAX_SPEED
      )
      startRenderLoop()
      break
    }
  }
}

const handleWindowKeyDown = (event) => {
  if (fullscreenImageData.value) return

  switch (event.key) {
    case "Enter": {
      event.preventDefault()
      selectedImage.value?.element?.click()
      break
    }

    case "Escape": {
      if (fullscreenImageData.value) break
      event.preventDefault()
      document.activeElement?.blur()
      clearImageSelection()
      break
    }

    case "PageDown": {
      event.preventDefault()
      if (isScrollPaused.value) break
      const pageDownDelta = -windowHeight.value * 0.6
      scrollPosition += pageDownDelta / resizeFactor.value
      velocity.value += clamp(
        (pageDownDelta / resizeFactor.value) * KEYBOARD_PAGE_IMPULSE,
        -MAX_SPEED,
        MAX_SPEED
      )
      startRenderLoop()
      break
    }

    case "PageUp": {
      event.preventDefault()
      if (isScrollPaused.value) break
      const pageUpDelta = windowHeight.value * 0.6
      scrollPosition += pageUpDelta / resizeFactor.value
      velocity.value += clamp(
        (pageUpDelta / resizeFactor.value) * KEYBOARD_PAGE_IMPULSE,
        -MAX_SPEED,
        MAX_SPEED
      )
      startRenderLoop()
      break
    }

    case "Tab": {
      if (isScrollPaused.value) break
      if (selectedImage.value) {
        if (event.shiftKey) {
          event.preventDefault()
          if (selectedImage.value.columnIndex > 0) {
            selectImageHorizontally(-1)
          } else {
            document.querySelector(".menu li:last-of-type button")?.focus()
            clearImageSelection()
          }
          break
        } else if (!event.shiftKey) {
          event.preventDefault()
          if (selectedImage.value.columnIndex < columnCount.value - 1) {
            selectImageHorizontally(1)
          } else {
            document.querySelector(".menu li:first-of-type button")?.focus()
            clearImageSelection()
          }
          break
        }
      } else if (document.activeElement === imageGallery.value) {
        event.preventDefault()
        selectImageHorizontally(event.shiftKey ? -1 : 1)
      }
      lastTabDirection = event.shiftKey ? -1 : 1
      break
    }
  }
  lastInputMethod = "keyboard"
}

watch(
  () => imagesStore.filteredImages,
  async (images) => {
    if (!images.length) return
    updateImageGroups()
    const currentImageIds = new Set(imagesStore.filteredImages.map((image) => image.id))
    loadedImageIds.value = new Set(
      [...loadedImageIds.value].filter((id) => currentImageIds.has(id))
    )
    visibleImageIds.value.clear()

    if (imagesStore.filteredImages.length > 0) {
      await nextTick()
      await rebuildLayout()
    }
  },
  { deep: true, immediate: true }
)

watch(columnCount, (newCount, oldCount) => {
  if (newCount !== oldCount) {
    cancelAnimationFrame(columnCountUpdateId)
    columnCountUpdateId = requestAnimationFrame(async () => {
      updateImageGroups()
      await rebuildLayout()
    })
  }
})

watch(initialLoadProgress, (progress) => {
  if (progress === 1 && !isFirstLoad && !fullscreenImageData.value) {
    isScrollPaused.value = false
    updateImagePositions()
    for (const card of imageCardData) {
      if (card.visible) {
        card.setOpacity(0)
        card.setScale(0.8)
      }
    }
    startZoomReturn({ duration: ZOOM_TOTAL_DURATION / 2, withTarget: false })
  }
})

watch(resizeFactor, () => startRenderLoop())
watch(windowHeight, () => {
  if (columnsHeights.value.length > 0) {
    const minColumnHeight = Math.min(...columnsHeights.value)
    const viewportHeightInBaselineSpace = windowHeight.value / resizeFactor.value
    canInfiniteScroll.value =
      minColumnHeight - currentSpacing.value >=
      viewportHeightInBaselineSpace + (VIRTUAL_BUFFER * 3) / resizeFactor.value
  }
  startRenderLoop()
})

onMounted(() => {
  window.addEventListener("focusin", handleWindowFocusIn)
  window.addEventListener("keydown", handleWindowKeyDown)
  window.addEventListener("pointerdown", handleWindowPointerDown)

  if (!route.path.includes("/images/")) {
    props.menuVisible && showMenu(true)
  }

  if (props.continuousScroll) {
    startAutoScroll()
  }
})

onUnmounted(() => {
  window.removeEventListener("focusin", handleWindowFocusIn)
  window.removeEventListener("keydown", handleWindowKeyDown)
  window.removeEventListener("pointerdown", handleWindowPointerDown)

  if (userInactivityTimer) {
    clearTimeout(userInactivityTimer)
  }
})

defineExpose({
  isAnimating: () => !isRenderLoopIdle(),
  isScrollPaused: () => isScrollPaused.value,
  pauseScrolling,
  resumeScrolling
})
</script>

<template>
  <div
    v-if="!noImages"
    ref="image-gallery"
    class="image-gallery"
    :class="{ dragging: isDragging, building: isBuildingLayout }"
    tabindex="0"
    @wheel="handleWheel"
    @keydown="handleKeyDown"
    @touchstart="handleDragStart"
    @touchmove="handleDragMove"
    @touchend="handleDragEnd"
    @mousedown="handleDragStart"
    @mousemove="handleDragMove"
    @mouseleave="handleDragEnd"
    @mouseup="handleDragEnd"
  >
    <div
      v-for="(group, index) in imageGroups"
      :key="index"
      class="gallery-column"
      :style="{
        width: columnWidth + 'px',
        marginLeft: `${index === 0 ? firstColumnMargin : currentSpacing}px`
      }"
    >
      <ImageCard
        v-for="image in group"
        :key="image.id"
        :identifier="image.id"
        :image="image"
        :should-load="visibleImageIds.has(image.id)"
        :has-dragged="hasDragged && !isZoomTransitionActive"
        @load="handleImageLoad"
        @click="handleImageClick"
      />
    </div>
  </div>
  <EmptyGalleryState v-else />
  <Loading
    v-if="isFirstLoad && !noImages"
    :progress="initialLoadProgress * 100"
    :on-complete="onFirstLoadComplete"
  />
  <div v-if="SHOW_DEBUG_INFO" class="debug-info">
    <p>Columns: {{ columnCount }}</p>
    <p>Column Width: {{ columnWidth.toFixed(2) }} px</p>
    <p>Resize Factor: {{ resizeFactor.toFixed(3) }}</p>
    <p>Velocity: {{ velocity.toFixed(2) }} px/s</p>
    <p>Normalized Scroll Y: {{ scrollPosition.toFixed(2) }} px</p>
    <p>Images Visible: {{ visibleImageIds.size }}</p>
    <p>Images Loaded: {{ loadedImageIds.size }} / {{ imagesStore.filteredImages.length }}</p>
    <p>Initial Load Progress: {{ Math.ceil(initialLoadProgress * 100) }}%</p>
    <p>Is First Load: {{ isFirstLoad }}</p>
    <p>Can Infinite Scroll: {{ canInfiniteScroll }}</p>
    <p>Max Scroll Distance: {{ maxScrollDistance }}</p>
  </div>
</template>

<style lang="scss">
.image-gallery {
  display: flex;
  flex-direction: row;
  margin: 0;
  overflow: hidden;
  height: 100vh;
  user-select: none;
  outline: none;

  &.dragging,
  &.dragging .image-card {
    cursor: grabbing;
  }

  &.building::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--background);
    z-index: z(overlay);
  }
}

.gallery-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  user-select: none;
}
</style>
