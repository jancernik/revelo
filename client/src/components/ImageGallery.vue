<script setup>
import ImageCard from "#src/components/ImageCard.vue"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useImagesStore } from "#src/stores/images"
import { clamp, lerp } from "#src/utils/helpers"
import { gsap } from "gsap"
import { computed, nextTick, ref, useTemplateRef, watch } from "vue"

const SPACING = 15 // Space between images and columns in pixels
const VIRTUAL_BUFFER = 400 // Buffer area outside viewport for performance optimization

const MAX_COLUMN_WIDTH = 200 // Maximum width of individual columns in pixels
const MIN_COLUMNS = 3 // Minimum number of columns to display
const MAX_COLUMNS = 9 // Maximum number of columns to display

const DRAG_FACTOR = 1.5 // Multiplier for drag sensitivity
const WHEEL_IMPULSE = 5.0 // Scroll wheel velocity multiplier
const DRAG_IMPULSE = 1.0 // Drag velocity impulse factor
const KEYBOARD_PAGE_IMPULSE = 2.0 // Page up/down and space bar velocity multiplier
const KEYBOARD_ARROW_IMPULSE = 2.0 // Arrow key velocity multiplier
const VELOCITY_DECAY = 5.0 // Rate at which velocity decays over time
const PAUSED_VELOCITY_DECAY = 10.0 // Rate at which velocity decays over time when paused
const MAX_SPEED = 3000 // Maximum scroll velocity in pixels per second
const VELOCITY_THRESHOLD = 4 // Minimum velocity below which scrolling stops
const MAX_SCROLL_DELTA = 80 // Maximum scroll delta per wheel event

const MAX_SCROLL_LERP = 0.1 // Lerp factor at center column (fastest response)
const MIN_SCROLL_LERP = 0.05 // Lerp factor at outermost columns (slowest response)
const VELOCITY_LERP_FACTOR = 0.35 // Velocity smoothing factor for drag interactions
const MAX_DELTA_TIME = 0.05 // Maximum delta time for frame rate limiting
const MIN_DELTA_TIME = 0.001 // Minimum delta time to prevent division by zero

const SHOW_DEBUG_INFO = false // Toggle display of debug information

let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let normalizedScrollY = 0
let dragStartY = 0

let cumulativeColumnsHeights = []
let columnImageCounts = []
let imageStates = []
let scrollTargets = []
let columnCountAnimationFrameId = 0
let isBuildingLayout = false
let lastMaxVelocityRecorded = 0
let columnScalableHeights = []
let columnSpacing = []
let columnLerpFactors = []
let columnWrappedHeights = []
let lastResizeFactor = 1
let animationFrameId = 0
let visibleImageStates = []
let currentVelocityDecay = VELOCITY_DECAY

const { height: windowHeight, width: windowWidth } = useWindowSize()
const imagesStore = useImagesStore()
const imageGallery = useTemplateRef("image-gallery")

const imageGroups = ref([])
const loadedImageIds = ref(new Set())
const visibleImageIds = ref(new Set())
const isDragging = ref(false)
const baselineColumnWidth = ref(0)
const velocity = ref(0)
const isScrollPaused = ref(false)

const maxVelocityRecorded = computed(() => {
  if (velocity.value !== 0) {
    lastMaxVelocityRecorded = Math.max(lastMaxVelocityRecorded, Math.abs(velocity.value))
  }
  return lastMaxVelocityRecorded
})

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

const groupImages = (images = [], groupCount) => {
  if (!Array.isArray(images) || images.length === 0) return []
  if (!groupCount || groupCount <= 0) return images

  const imagesWithWeights = images.map((image) => {
    const imageData = image?.versions?.find((v) => v.type === "regular") || {}
    const height = imageData.height || 0
    const width = imageData.width || 0
    const aspectRatio = width > 0 ? height / width : 0
    const weight = Number(aspectRatio.toFixed(3))
    return { ...image, _weight: weight }
  })

  imagesWithWeights.sort((a, b) => b._weight - a._weight)

  const groups = Array.from({ length: groupCount }, () => [])
  const totals = Array.from({ length: groupCount }, () => 0)

  for (const image of imagesWithWeights) {
    const index = totals.indexOf(Math.min(...totals))
    const { _weight, ...cleanImage } = image
    totals[index] = Number((totals[index] + _weight).toFixed(3))
    groups[index].push(cleanImage)
  }

  return groups
}

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
    cancelAnimationFrame(columnCountAnimationFrameId)
    columnCountAnimationFrameId = requestAnimationFrame(async () => {
      updateImageGroups()
      await rebuildLayout()
    })
  }
})

watch(resizeFactor, () => startRenderLoop())
const calculateImagePositions = () => {
  cumulativeColumnsHeights = Array.from({ length: columnCount.value }, () => SPACING)
  columnImageCounts = Array.from({ length: columnCount.value }, () => 0)
  imageStates = []

  imageGallery.value.querySelectorAll(".gallery-column").forEach((columnElement, columnIndex) => {
    columnElement.querySelectorAll(".image-card").forEach((cardElement, cardIndex) => {
      const img = cardElement.querySelector("img")
      const cardHeight = (img.height / img.width) * columnWidth.value
      imageStates.push({
        cardHeight,
        cardIndex,
        cardTop: cumulativeColumnsHeights[columnIndex],
        columnIndex,
        element: cardElement,
        imageId: img.dataset.id,
        setY: gsap.quickSetter(cardElement, "y", "px"),
        visible: false
      })
      cumulativeColumnsHeights[columnIndex] += cardHeight + SPACING
      columnImageCounts[columnIndex]++
    })
    cumulativeColumnsHeights[columnIndex] -= SPACING
  })
}

const calculateColumnLerpFactors = () => {
  const centerIndex = (columnCount.value - 1) / 2
  columnLerpFactors = Array.from({ length: columnCount.value }, (_, columnIndex) => {
    const distanceFromCenter =
      centerIndex === 0 ? 0 : Math.abs(columnIndex - centerIndex) / centerIndex
    const easedDistance = 0.5 * (1 + Math.cos(Math.PI * distanceFromCenter))
    return MIN_SCROLL_LERP + (MAX_SCROLL_LERP - MIN_SCROLL_LERP) * easedDistance
  })
}

const calculateColumnDimensions = () => {
  columnScalableHeights = Array.from({ length: columnCount.value }, (_, columnIndex) => {
    return cumulativeColumnsHeights[columnIndex] - SPACING * columnImageCounts[columnIndex]
  })
  columnSpacing = Array.from({ length: columnCount.value }, (_, columnIndex) => {
    return SPACING * columnImageCounts[columnIndex]
  })
  columnWrappedHeights = new Array(columnCount.value).fill(0)
}

const hideAllImages = () => {
  for (const state of imageStates) {
    state.setY(window.innerHeight * 2)
    state.element.style.visibility = "hidden"
    state.element.style.willChange = "auto"
  }
}

const rebuildLayout = async () => {
  isBuildingLayout = true
  velocity.value = 0
  scrollTargets = []
  baselineColumnWidth.value = columnWidth.value

  await nextTick()
  calculateImagePositions()
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
  scrollTargets = Array.from(
    { length: columnCount.value },
    (_, columnIndex) => previousTargets[columnIndex] ?? normalizedScrollY
  )
}

const updateImagePositions = () => {
  if (isBuildingLayout) return

  for (let columnIndex = 0; columnIndex < scrollTargets.length; columnIndex++) {
    const lerpFactor = columnLerpFactors[columnIndex] ?? MIN_SCROLL_LERP
    scrollTargets[columnIndex] = lerp(scrollTargets[columnIndex], normalizedScrollY, lerpFactor)
  }

  visibleImageStates = []
  const viewTop = -VIRTUAL_BUFFER
  const viewBottom = windowHeight.value + VIRTUAL_BUFFER

  for (let columnIndex = 0; columnIndex < columnCount.value; columnIndex++) {
    columnWrappedHeights[columnIndex] =
      columnScalableHeights[columnIndex] * resizeFactor.value + columnSpacing[columnIndex]
  }

  for (let stateIndex = 0; stateIndex < imageStates.length; stateIndex++) {
    const state = imageStates[stateIndex]
    const columnIndex = state.columnIndex
    const columnWrappedHeight = columnWrappedHeights[columnIndex]
    if (columnWrappedHeight <= 0) continue

    const constantSpacing = (state.cardIndex + 1) * SPACING
    const scaledCardTop = (state.cardTop - constantSpacing) * resizeFactor.value
    const cardY = scaledCardTop + constantSpacing + scrollTargets[columnIndex] * resizeFactor.value

    const minY = -state.cardHeight * resizeFactor.value
    const totalSpacing = columnSpacing[columnIndex]
    const columnHeight = cumulativeColumnsHeights[columnIndex]
    const scalableMaxY = (columnHeight - totalSpacing - state.cardHeight) * resizeFactor.value
    const maxY = scalableMaxY + totalSpacing

    const wrappedY = gsap.utils.wrap(minY, maxY, cardY)

    const scaledCardHeight = state.cardHeight * resizeFactor.value
    const cardBottom = wrappedY + scaledCardHeight
    const isVisible = cardBottom >= viewTop && wrappedY <= viewBottom

    const lazyLoadBuffer = VIRTUAL_BUFFER * 2
    const shouldLoad =
      cardBottom >= viewTop - lazyLoadBuffer && wrappedY <= viewBottom + lazyLoadBuffer

    if (shouldLoad && !visibleImageIds.value.has(state.imageId)) {
      visibleImageIds.value.add(state.imageId)
    }

    if (isVisible) {
      if (!state.visible) {
        state.visible = true
        state.element.style.visibility = "visible"
        state.element.style.willChange = "transform"
      }
      state.setY(wrappedY)
      visibleImageStates.push(state)
    } else if (state.visible) {
      state.visible = false
      state.element.style.visibility = "hidden"
      state.element.style.willChange = "auto"
    }
  }
}

const startRenderLoop = () => {
  if (animationFrameId) return
  lastFrameTimestamp = performance.now()
  lastResizeFactor = resizeFactor.value
  animationFrameId = requestAnimationFrame(renderFrame)
}

const stopRenderLoop = () => {
  if (!animationFrameId) return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = 0
  lastFrameTimestamp = 0
}

const isRenderLoopIdle = () => {
  if (isBuildingLayout || isDragging.value) return false
  const scrollTargetsSettled =
    scrollTargets.length === columnCount.value &&
    scrollTargets.every((target) => Math.abs(target - normalizedScrollY) < 0.5)
  const velocitySettled = Math.abs(velocity.value) < VELOCITY_THRESHOLD
  const resizeFactorStable = Math.abs(resizeFactor.value - lastResizeFactor) < 1e-6
  return scrollTargetsSettled && velocitySettled && resizeFactorStable
}

const renderFrame = (timestamp) => {
  animationFrameId = requestAnimationFrame(renderFrame)
  const deltaTime = Math.min(MAX_DELTA_TIME, (timestamp - (lastFrameTimestamp || timestamp)) / 1000)
  lastFrameTimestamp = timestamp
  if (!isBuildingLayout && !isDragging.value) {
    normalizedScrollY += velocity.value * deltaTime
    const velocityDecay = Math.exp(-currentVelocityDecay * deltaTime)
    velocity.value = clamp(velocity.value * velocityDecay, -MAX_SPEED, MAX_SPEED)
    if (Math.abs(velocity.value) < VELOCITY_THRESHOLD) velocity.value = 0
  }
  updateImagePositions()
  if (isRenderLoopIdle()) stopRenderLoop()
  lastResizeFactor = resizeFactor.value
}

const resumeScrolling = () => {
  isScrollPaused.value = false
  currentVelocityDecay = VELOCITY_DECAY
}

const pauseScrolling = () => {
  isDragging.value = false
  isScrollPaused.value = true
  currentVelocityDecay = PAUSED_VELOCITY_DECAY
}

const handleImageClick = () => {
  if (isScrollPaused.value) {
    resumeScrolling()
  } else {
    pauseScrolling()
  }
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
}

const handleWheel = (event) => {
  event.preventDefault?.()
  if (isScrollPaused.value) return
  const deltaY = clamp(event.deltaY, -MAX_SCROLL_DELTA, MAX_SCROLL_DELTA)
  normalizedScrollY -= deltaY / resizeFactor.value
  velocity.value += clamp((-deltaY / resizeFactor.value) * WHEEL_IMPULSE, -MAX_SPEED, MAX_SPEED)
  startRenderLoop()
}

const handleDragStart = (event) => {
  event.preventDefault?.()
  isDragging.value = true
  dragStartY = event.clientY || event.touches?.[0]?.clientY || 0
  lastDragTimestamp = performance.now()
  velocity.value = 0
  imageGallery.value?.focus()
}

const handleDragMove = (event) => {
  event.preventDefault?.()
  if (!isDragging.value || isScrollPaused.value) return
  const currentY = event.clientY || event.touches?.[0]?.clientY || dragStartY
  const deltaY = (currentY - dragStartY) * DRAG_FACTOR
  dragStartY = currentY
  normalizedScrollY += deltaY / resizeFactor.value

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
    normalizedScrollY += scrollDelta / resizeFactor.value
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
    <p>Max velocity: {{ maxVelocityRecorded.toFixed(2) }} px/s</p>
    <p>Normalized Scroll Y: {{ normalizedScrollY.toFixed(2) }} px</p>
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
