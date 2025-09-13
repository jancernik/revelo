<script setup>
import ImageCard from "#src/components/images/ImageCard.vue"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
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
import { computed, nextTick, ref, useTemplateRef, watch } from "vue"

const SPACING = 15 // Space between images and columns in pixels
const VIRTUAL_BUFFER = 600 // Buffer area outside viewport for performance optimization
const MAX_COLUMN_WIDTH = 200 // Maximum width of individual columns in pixels
const MIN_COLUMNS = 3 // Minimum number of columns to display
const MAX_COLUMNS = 9 // Maximum number of columns to display

const DRAG_FACTOR = 1.5 // Multiplier for drag sensitivity
const WHEEL_IMPULSE = 5.0 // Scroll wheel velocity multiplier
const DRAG_IMPULSE = 1.0 // Drag velocity impulse factor
const KEYBOARD_PAGE_IMPULSE = 2.0 // Page up/down and space bar velocity multiplier
const KEYBOARD_ARROW_IMPULSE = 2.0 // Arrow key velocity multiplier
const VELOCITY_DECAY = 4.0 // Rate at which velocity decays over time
const PAUSED_VELOCITY_DECAY = 10.0 // Rate at which velocity decays over time when paused
const MAX_SPEED = 3000 // Maximum scroll velocity in pixels per second
const VELOCITY_THRESHOLD = 4 // Minimum velocity below which scrolling stops
const MAX_SCROLL_DELTA = 80 // Maximum scroll delta per wheel event

const MAX_SCROLL_LERP = 0.1 // Lerp factor at center column (fastest response)
const MIN_SCROLL_LERP = 0.05 // Lerp factor at outermost columns (slowest response)
const VELOCITY_LERP_FACTOR = 0.35 // Velocity smoothing factor for drag interactions
const MAX_DELTA_TIME = 0.05 // Maximum delta time for frame rate limiting
const MIN_DELTA_TIME = 0.001 // Minimum delta time to prevent division by zero

const ZOOM_DURATION = 0.2 // Duration for images to fade out when zooming to detail view
const ZOOM_TOTAL_DURATION = 0.6 // Total duration for all staggered fade animations to complete

const SHOW_DEBUG_INFO = false // Toggle display of debug information

let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let zoomAnimationEndTimestamp = 0
let zoomAnimationStartTimestamp = 0
let scrollPosition = 0
let dragStartPosition = 0

let columnsHeights = []
let columnImageCounts = []
let imageCardData = []
let scrollTargets = []
let columnCountUpdateId = 0
let isBuildingLayout = false
let columnScalableHeights = []
let columnSpacing = []
let columnLerpFactors = []
let columnWrappedHeights = []
let lastResizeFactor = 1
let renderLoopId = 0
let currentVelocityDecay = VELOCITY_DECAY

let isZoomTransitionActive = false
let isZoomingOut = true
let zoomTargetImageId = null
let zoomReferencePoint = null

const { imageData: fullscreenImageData, show: showFullscreenImage } = useFullscreenImage()
const { height: windowHeight, width: windowWidth } = useWindowSize()
const imagesStore = useImagesStore()
const imageGallery = useTemplateRef("image-gallery")

const imageGroups = ref([])
const loadedImageIds = ref(new Set())
const visibleImageIds = ref(new Set())
const isDragging = ref(false)
const hasDragged = ref(false)
const baselineColumnWidth = ref(0)
const velocity = ref(0)
const isScrollPaused = ref(false)

const columnCount = computed(() => {
  const base = Math.ceil((windowWidth.value - SPACING) / (MAX_COLUMN_WIDTH + SPACING))
  const clamped = clamp(base, MIN_COLUMNS, MAX_COLUMNS)
  if (clamped % 2 === 0) return clamped < MAX_COLUMNS ? clamped + 1 : clamped - 1
  return clamped
})

const columnWidth = computed(() => {
  return (windowWidth.value - SPACING * (columnCount.value + 1)) / columnCount.value
})

const resizeFactor = computed(() => {
  return baselineColumnWidth.value === 0 ? 1 : columnWidth.value / baselineColumnWidth.value
})

const updateImageGroups = () => {
  const groups = groupImages(imagesStore.filteredImages, columnCount.value)
  imageGroups.value = groups.map((group) => gsap.utils.shuffle(group))
}

watch(
  () => imagesStore.filteredImages,
  async () => {
    updateImageGroups()
    const currentImageIds = new Set(imagesStore.filteredImages.map((image) => image.id))
    loadedImageIds.value = new Set(
      [...loadedImageIds.value].filter((id) => currentImageIds.has(id))
    )
    visibleImageIds.value.clear()

    if (imagesStore.filteredImages.length > 0) {
      await nextTick()
      await rebuildLayout()
      imageGallery.value?.focus()
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

watch(resizeFactor, () => startRenderLoop())

const calculateImageCardsData = () => {
  columnsHeights = createArray(columnCount.value, SPACING + VIRTUAL_BUFFER - 1)
  columnImageCounts = createArray(columnCount.value, 0)
  clearArray(imageCardData)

  imageGallery.value.querySelectorAll(".gallery-column").forEach((columnElement, columnIndex) => {
    columnElement.querySelectorAll(".image-card").forEach((cardElement, cardIndex) => {
      const img = cardElement.querySelector("img")
      const cardHeight = (img.height / img.width) * columnWidth.value
      imageCardData.push({
        animationDelay: 0,
        cardHeight,
        cardIndex,
        cardTop: columnsHeights[columnIndex],
        columnIndex,
        element: cardElement,
        imageId: img.dataset.id,
        setOpacity: gsap.quickSetter(cardElement, "opacity"),
        setScale: (value) => gsap.set(cardElement, { scale: value }),
        setY: gsap.quickSetter(cardElement, "y", "px"),
        visible: false
      })
      columnsHeights[columnIndex] += cardHeight + SPACING
      columnImageCounts[columnIndex]++
    })
    columnsHeights[columnIndex] -= SPACING + VIRTUAL_BUFFER - 1
  })
}

const calculateColumnLerpFactors = () => {
  const centerIndex = (columnCount.value - 1) / 2
  columnLerpFactors = createArray(columnCount.value, (columnIndex) => {
    if (centerIndex === 0) return MAX_SCROLL_LERP

    const distanceFromCenter = Math.abs(columnIndex - centerIndex) / centerIndex
    const easedDistance = easeInOutSine(1 - distanceFromCenter)
    return MIN_SCROLL_LERP + (MAX_SCROLL_LERP - MIN_SCROLL_LERP) * easedDistance
  })
}

const calculateColumnDimensions = () => {
  columnScalableHeights = createArray(columnCount.value, (columnIndex) => {
    return columnsHeights[columnIndex] - SPACING * columnImageCounts[columnIndex]
  })
  columnSpacing = createArray(columnCount.value, (columnIndex) => {
    return SPACING * columnImageCounts[columnIndex]
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
  isBuildingLayout = true
  velocity.value = 0
  scrollTargets = []
  baselineColumnWidth.value = columnWidth.value

  await nextTick()
  calculateImageCardsData()
  calculateColumnDimensions()
  calculateColumnLerpFactors()
  initializeScrollTargets()
  hideAllImages()

  requestAnimationFrame(() => {
    isBuildingLayout = false
    startRenderLoop()
  })
}

const initializeScrollTargets = () => {
  const previousTargets = scrollTargets
  scrollTargets = createArray(columnCount.value, (columnIndex) => {
    return previousTargets[columnIndex] ?? scrollPosition
  })
}

const assignFadeDelays = (imageCardData) => {
  const totalImages = imageCardData.length
  const dynamicStagger = totalImages > 1 ? ZOOM_TOTAL_DURATION / (totalImages - 1) : 0
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

const startZoomReturn = (withTarget) => {
  const visibleNonTargetStates = imageCardData.filter(
    (state) => state.visible && state.imageId !== zoomTargetImageId
  )

  const referencePoint = withTarget
    ? zoomReferencePoint
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

  const sortedStates = sortStatesByDistance(visibleNonTargetStates, referencePoint, false)
  assignFadeDelays(sortedStates)

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
    if (zoomTargetImageId && imageCard.imageId !== zoomTargetImageId) {
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
    const lerpFactor = columnLerpFactors[columnIndex] ?? MIN_SCROLL_LERP
    scrollTargets[columnIndex] = lerp(scrollTargets[columnIndex], scrollPosition, lerpFactor)
  }
}

const calculateWrappedPosition = (card) => {
  const constantSpacing = (card.cardIndex + 1) * SPACING
  const scaledCardTop = (card.cardTop - constantSpacing) * resizeFactor.value
  const scaledScrollTarget = scrollTargets[card.columnIndex] * resizeFactor.value
  const cardPosition = scaledCardTop + constantSpacing + scaledScrollTarget - VIRTUAL_BUFFER

  const minY = -card.cardHeight * resizeFactor.value - VIRTUAL_BUFFER
  const totalSpacing = columnSpacing[card.columnIndex]
  const columnHeight = columnsHeights[card.columnIndex]
  const scalableMaxY = (columnHeight - totalSpacing - card.cardHeight) * resizeFactor.value
  const maxY = scalableMaxY + totalSpacing - VIRTUAL_BUFFER

  return gsap.utils.wrap(minY, maxY, cardPosition)
}

const updateImagePositions = (forceSetY = false) => {
  if (isBuildingLayout) return

  updateScrollTargets()

  const viewTop = -VIRTUAL_BUFFER
  const viewBottom = windowHeight.value + VIRTUAL_BUFFER
  const now = performance.now()

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

    if (isVisible && !visibleImageIds.value.has(card.imageId)) {
      visibleImageIds.value.add(card.imageId)
    }

    if (isVisible && !card.visible) {
      card.visible = true
      card.element.style.visibility = "visible"
      card.element.style.willChange = "transform"
    } else if (!isVisible && card.visible) {
      card.visible = false
      card.element.style.visibility = "hidden"
      card.element.style.willChange = "auto"
    }

    if (isVisible) {
      if (forceSetY) {
        card.setY(wrappedPosition)
      } else if (
        (!isZoomTransitionActive || card.imageId !== zoomTargetImageId) &&
        !(fullscreenImageData.value && card.imageId === fullscreenImageData.value.id)
      ) {
        const targetOpacity = calculateZoomAnimationValue(card, now, 1, 1, 0)
        const targetScale = calculateZoomAnimationValue(card, now, 1, 1, 0.8)
        card.setOpacity(targetOpacity)
        card.setScale(targetScale)
        card.setY(wrappedPosition)
      }
    }
  }
}

const updateVelocity = (deltaTime) => {
  if (!isBuildingLayout && !isDragging.value) {
    scrollPosition += velocity.value * deltaTime
    const velocityDecay = Math.exp(-currentVelocityDecay * deltaTime)
    velocity.value = clamp(velocity.value * velocityDecay, -MAX_SPEED, MAX_SPEED)
    if (Math.abs(velocity.value) < VELOCITY_THRESHOLD) velocity.value = 0
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
    }
  }
}

const isRenderLoopIdle = () => {
  if (isBuildingLayout || isDragging.value) return false
  if (isZoomTransitionActive) return false

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

const handleFullscreenReturn = (withTarget) => {
  if (zoomTargetImageId) {
    startZoomReturn(withTarget)
  }
}

const checkImageVisibility = (imageId) => {
  const card = imageCardData.find((card) => card.imageId === imageId)
  return card ? card.visible : false
}

const handleImageClick = (event, image, flipId) => {
  if (zoomTargetImageId) return
  pauseScrolling()
  startZoomTransition(image.id, event.currentTarget)
  showFullscreenImage(image, {
    flipId,
    isThumbnailVisible: () => checkImageVisibility(image.id),
    onReturn: handleFullscreenReturn,
    updatePositions: () => updateImagePositions(true)
  })
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
}

const handleWheel = (event) => {
  event.preventDefault?.()
  if (isScrollPaused.value) return
  const deltaY = clamp(event.deltaY, -MAX_SCROLL_DELTA, MAX_SCROLL_DELTA)
  scrollPosition -= deltaY / resizeFactor.value
  velocity.value += clamp((-deltaY / resizeFactor.value) * WHEEL_IMPULSE, -MAX_SPEED, MAX_SPEED)
  startRenderLoop()
}

const handleDragStart = (event) => {
  event.preventDefault?.()
  isDragging.value = true
  hasDragged.value = false
  dragStartPosition = event.clientY || event.touches?.[0]?.clientY || 0
  lastDragTimestamp = performance.now()
  velocity.value = 0
  imageGallery.value?.focus()
}

const handleDragMove = (event) => {
  event.preventDefault?.()
  if (!isDragging.value || isScrollPaused.value) return
  const currentY = event.clientY || event.touches?.[0]?.clientY || dragStartPosition
  const deltaY = (currentY - dragStartPosition) * DRAG_FACTOR

  if (Math.abs(deltaY) > 2) {
    hasDragged.value = true
  }

  dragStartPosition = currentY
  scrollPosition += deltaY / resizeFactor.value

  const now = performance.now()
  const deltaTime = Math.max(MIN_DELTA_TIME, (now - lastDragTimestamp) / 1000)
  lastDragTimestamp = now

  const instantaneousVelocity = ((deltaY / resizeFactor.value) * DRAG_IMPULSE) / deltaTime
  velocity.value = clamp(
    lerp(velocity.value, instantaneousVelocity, VELOCITY_LERP_FACTOR),
    -MAX_SPEED,
    MAX_SPEED
  )
  startRenderLoop()
}

const handleDragEnd = (event) => {
  event.preventDefault?.()
  if (isScrollPaused.value) return
  isDragging.value = false

  setTimeout(() => {
    hasDragged.value = false
  }, 50)
}

const handleKeyDown = (event) => {
  let scrollDelta = 0
  let impulseMultiplier = 0

  switch (event.key) {
    case " ":
      event.preventDefault()
      if (isScrollPaused.value) return
      scrollDelta = event.shiftKey ? windowHeight.value : -windowHeight.value * 0.6
      impulseMultiplier = KEYBOARD_PAGE_IMPULSE
      break
    case "ArrowDown":
      event.preventDefault()
      if (isScrollPaused.value) return
      scrollDelta = -windowHeight.value * 0.2
      impulseMultiplier = KEYBOARD_ARROW_IMPULSE
      break
    case "ArrowUp":
      event.preventDefault()
      if (isScrollPaused.value) return
      scrollDelta = windowHeight.value * 0.2
      impulseMultiplier = KEYBOARD_ARROW_IMPULSE
      break
    case "PageDown":
      event.preventDefault()
      if (isScrollPaused.value) return
      scrollDelta = -windowHeight.value * 0.6
      impulseMultiplier = KEYBOARD_PAGE_IMPULSE
      break
    case "PageUp":
      event.preventDefault()
      if (isScrollPaused.value) return
      scrollDelta = windowHeight.value * 0.6
      impulseMultiplier = KEYBOARD_PAGE_IMPULSE
      break
    default:
      return
  }

  if (scrollDelta !== 0) {
    scrollPosition += scrollDelta / resizeFactor.value
    velocity.value += clamp(
      (scrollDelta / resizeFactor.value) * impulseMultiplier,
      -MAX_SPEED,
      MAX_SPEED
    )
    startRenderLoop()
  }
}
</script>

<template>
  <div
    ref="image-gallery"
    class="image-gallery"
    :class="{ dragging: isDragging }"
    tabindex="0"
    @mousewheel="handleWheel"
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
      :style="{ width: columnWidth + 'px', marginLeft: SPACING + 'px' }"
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
  <div v-if="SHOW_DEBUG_INFO" class="debug-info">
    <p>Columns: {{ columnCount }}</p>
    <p>Column Width: {{ columnWidth.toFixed(2) }} px</p>
    <p>Resize Factor: {{ resizeFactor.toFixed(3) }}</p>
    <p>Velocity: {{ velocity.toFixed(2) }} px/s</p>
    <p>Normalized Scroll Y: {{ scrollPosition.toFixed(2) }} px</p>
    <p>Images Visible: {{ visibleImageIds.size }}</p>
    <p>Images Loaded: {{ loadedImageIds.size }} / {{ imagesStore.filteredImages.length }}</p>
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

  &.dragging {
    cursor: grabbing;
  }
}

.gallery-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  user-select: none;
}

.debug-info {
  position: fixed;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 10px;
  font-size: 12px;
  width: 280px;
  z-index: 1000;
}
</style>
