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
const VELOCITY_DECAY = 6.0 // Rate at which velocity decays over time
const MAX_SPEED = 3000 // Maximum scroll velocity in pixels per second
const VELOCITY_THRESHOLD = 4 // Minimum velocity below which scrolling stops
const MAX_SCROLL_DELTA = 80 // Maximum scroll delta per wheel event

const MAX_SCROLL_LERP = 0.1 // Lerp factor at center column (fastest response)
const MIN_SCROLL_LERP = 0.05 // Lerp factor at outermost columns (slowest response)
const VELOCITY_LERP_FACTOR = 0.35 // Velocity smoothing factor for drag interactions
const MAX_DELTA_TIME = 0.05 // Maximum delta time for frame rate limiting
const MIN_DELTA_TIME = 0.001 // Minimum delta time to prevent division by zero

const SHOW_DEBUG_INFO = true // Toggle display of debug information

let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let normalizedScrollY = 0
let dragStartY = 0

let cumulativeColumnsHeights = []
let columnImageCounts = []
let imageStates = []
let scrollTargets = []
let columnCountAnimationFrameId = 0
let isRendering = false
let isBuildingLayout = false
let lastMaxVelocityRecorded = 0

const { height: windowHeight, width: windowWidth } = useWindowSize()
const imagesStore = useImagesStore()
const imageGallery = useTemplateRef("image-gallery")

const imageGroups = ref([])
const loadedImageIds = ref(new Set())
const isDragging = ref(false)
const baselineColumnWidth = ref(0)
const velocity = ref(0)

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

const middleColumnIndex = computed(() => (columnCount.value - 1) / 2)

const columnWidth = computed(() => {
  return (windowWidth.value - SPACING * (columnCount.value + 1)) / columnCount.value
})

const resizeFactor = computed(() => {
  return baselineColumnWidth.value === 0 ? 1 : columnWidth.value / baselineColumnWidth.value
})

const allImagesLoaded = computed(() => {
  return loadedImageIds.value.size === imagesStore.filteredImages.length
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
  () => {
    updateImageGroups()
    const currentImageIds = new Set(imagesStore.filteredImages.map((image) => image.id))
    loadedImageIds.value = new Set(
      [...loadedImageIds.value].filter((id) => currentImageIds.has(id))
    )
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

const calculateImagePositions = () => {
  cumulativeColumnsHeights = Array.from({ length: columnCount.value }, () => SPACING)
  columnImageCounts = Array.from({ length: columnCount.value }, () => 0)
  imageStates = []

  imageGallery.value.querySelectorAll(".gallery-column").forEach((columnElement, columnIndex) => {
    columnElement.querySelectorAll(".image-card").forEach((cardElement, cardIndex) => {
      const cardHeight = cardElement.clientHeight
      imageStates.push({
        cardHeight,
        cardIndex,
        cardTop: cumulativeColumnsHeights[columnIndex],
        columnIndex,
        element: cardElement,
        setY: gsap.quickSetter(cardElement, "y", "px"),
        visible: false
      })
      cumulativeColumnsHeights[columnIndex] += cardHeight + SPACING
      columnImageCounts[columnIndex]++
    })
    cumulativeColumnsHeights[columnIndex] -= SPACING
  })
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
  initializeScrollTargets()
  hideAllImages()

  requestAnimationFrame(() => {
    isBuildingLayout = false
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

  scrollTargets = scrollTargets.map((lastTarget, columnIndex) => {
    const distanceFromCenter = Math.abs(columnIndex - middleColumnIndex.value)
    const maxD = middleColumnIndex.value
    const dNorm = maxD === 0 ? 0 : distanceFromCenter / maxD

    const easeValue = 0.5 * (1 + Math.cos(Math.PI * dNorm))
    const alpha = MIN_SCROLL_LERP + (MAX_SCROLL_LERP - MIN_SCROLL_LERP) * easeValue

    return lerp(lastTarget, normalizedScrollY, alpha)
  })

  const viewTop = -VIRTUAL_BUFFER
  const viewBottom = windowHeight.value + VIRTUAL_BUFFER

  const wrapHeights = Array.from({ length: columnCount.value }, (_, i) => {
    const totalSpacing = SPACING * columnImageCounts[i]
    const scalableHeight = cumulativeColumnsHeights[i] - totalSpacing
    return scalableHeight * resizeFactor.value + totalSpacing
  })

  for (let stateIndex = 0; stateIndex < imageStates.length; stateIndex++) {
    const state = imageStates[stateIndex]
    const columnIndex = state.columnIndex
    const wrapHeight = wrapHeights[columnIndex]
    if (wrapHeight <= 0) continue

    const constantSpacing = (state.cardIndex + 1) * SPACING
    const scaledCardTop = (state.cardTop - constantSpacing) * resizeFactor.value

    const y = scaledCardTop + constantSpacing + scrollTargets[columnIndex] * resizeFactor.value

    const minY = -state.cardHeight * resizeFactor.value
    const totalSpacing = SPACING * columnImageCounts[columnIndex]
    const columnHeight = cumulativeColumnsHeights[columnIndex]
    const scalableMaxY = (columnHeight - totalSpacing - state.cardHeight) * resizeFactor.value
    const maxY = scalableMaxY + totalSpacing

    const yWrapped = gsap.utils.wrap(minY, maxY, y)

    const scaledHeight = state.cardHeight * resizeFactor.value
    const yBottom = yWrapped + scaledHeight
    const isVisible = yBottom >= viewTop && yWrapped <= viewBottom

    if (isVisible) {
      if (!state.visible) {
        state.visible = true
        state.element.style.visibility = "visible"
        state.element.style.willChange = "transform"
      }
      state.setY(yWrapped)
    } else if (state.visible) {
      state.visible = false
      state.element.style.visibility = "hidden"
      state.element.style.willChange = "auto"
    }
  }
}

const render = () => {
  if (!isRendering) isRendering = true
  requestAnimationFrame(render)

  const timestamp = performance.now()
  if (!lastFrameTimestamp) lastFrameTimestamp = timestamp
  const deltaTime = Math.min(MAX_DELTA_TIME, (timestamp - lastFrameTimestamp) / 1000)
  lastFrameTimestamp = timestamp

  if (!isBuildingLayout && !isDragging.value) {
    normalizedScrollY += velocity.value * deltaTime
    const decay = Math.exp(-VELOCITY_DECAY * deltaTime)
    velocity.value = clamp(velocity.value * decay, -MAX_SPEED, MAX_SPEED)
    if (Math.abs(velocity.value) < VELOCITY_THRESHOLD) velocity.value = 0
  }

  updateImagePositions()
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
  if (allImagesLoaded.value) {
    nextTick(async () => {
      await rebuildLayout()
      if (!isRendering) render()
    })
  }
}

const handleWheel = (event) => {
  event.preventDefault?.()
  const deltaY = clamp(event.deltaY, -MAX_SCROLL_DELTA, MAX_SCROLL_DELTA)
  normalizedScrollY -= deltaY / resizeFactor.value
  velocity.value += clamp((-deltaY / resizeFactor.value) * WHEEL_IMPULSE, -MAX_SPEED, MAX_SPEED)
}

const handleDragStart = (event) => {
  event.preventDefault?.()
  isDragging.value = true
  dragStartY = event.clientY || event.touches?.[0]?.clientY || 0
  lastDragTimestamp = performance.now()
  velocity.value = 0
}

const handleDragMove = (event) => {
  event.preventDefault?.()
  if (!isDragging.value) return
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
}

const handleDragEnd = (event) => {
  event.preventDefault?.()
  isDragging.value = false
}
</script>

<template>
  <div
    v-show="allImagesLoaded"
    ref="image-gallery"
    class="image-gallery"
    :class="{ dragging: isDragging }"
    @mousewheel="handleWheel"
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
        @load="handleImageLoad"
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
  &.dragging {
    cursor: grabbing;
  }
}

.gallery-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  pointer-events: none;
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
