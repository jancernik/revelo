<script setup>
import ImageCard from "#src/components/ImageCard.vue"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useImagesStore } from "#src/stores/images"
import { clamp, lerp } from "#src/utils/helpers"
import { gsap } from "gsap"
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue"

const SPACING = 15
const VIRTUAL_BUFFER = 400

const DRAG_FACTOR = 1.5
const WHEEL_IMPULSE = 2.0
const DRAG_IMPULSE = 1.0
const DECAY_PER_SEC = 6.0
const MAX_SPEED = 4000
const VELOCITY_THRESHOLD = 4

const MAX_COLUMN_WIDTH = 200
const MIN_COLUMNS = 3
const MAX_COLUMNS = 9

let velocity = 0
let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let normalizedScrollY = 0
let resizeFactor = 1
let dragStartY = 0

let cumulativeColumnsHeights = []
let imageStates = []

const { width: windowWidth } = useWindowSize()
const imagesStore = useImagesStore()
const groupedImages = ref([])
const loadedImageIds = ref(new Set())

const isDragging = ref(false)
let isRendering = false
let isLayoutSyncing = false

const imageGallery = useTemplateRef("image-gallery")

const columnCount = computed(() => {
  const base = Math.ceil((windowWidth.value - SPACING) / (MAX_COLUMN_WIDTH + SPACING))
  const clamped = clamp(base, MIN_COLUMNS, MAX_COLUMNS)
  if (clamped % 2 === 0) return clamped < MAX_COLUMNS ? clamped + 1 : clamped - 1
  return clamped
})
const columnWidth = ref(0)
const baselineContentWidth = ref(0)

const scrollTargets = ref([])

const allImagesLoaded = computed(
  () => loadedImageIds.value.size === imagesStore.filteredImages.length
)

const viewportContentWidth = (cols) => window.innerWidth - SPACING * (cols + 1)

const currentColumnWidth = (cols) => viewportContentWidth(cols) / cols

const groupImages = (images = [], numberOfGroups) => {
  if (!Array.isArray(images) || images.length === 0) return []
  if (!numberOfGroups || numberOfGroups <= 0) return images

  const imagesWithWeights = images.map((image) => {
    const imageData = image?.versions?.find((v) => v.type === "regular") || {}
    const height = imageData.height || 0
    const width = imageData.width || 0
    const aspectRatio = width > 0 ? height / width : 0
    const weight = Number(aspectRatio.toFixed(3))
    return { ...image, _weight: weight }
  })

  imagesWithWeights.sort((a, b) => b._weight - a._weight)

  const groups = Array.from({ length: numberOfGroups }, () => [])
  const totals = Array.from({ length: numberOfGroups }, () => 0)

  for (const image of imagesWithWeights) {
    const index = totals.indexOf(Math.min(...totals))
    const { _weight, ...cleanImage } = image
    totals[index] = Number((totals[index] + _weight).toFixed(3))
    groups[index].push(cleanImage)
  }

  return groups
}

const populateImageGroups = () => {
  const groups = groupImages(imagesStore.filteredImages, columnCount.value)
  groupedImages.value = groups.map((group) => gsap.utils.shuffle(group))
}

watch(
  () => imagesStore.filteredImages,
  () => {
    populateImageGroups()
    const currentIds = new Set(imagesStore.filteredImages.map((image) => image.id))
    loadedImageIds.value = new Set([...loadedImageIds.value].filter((id) => currentIds.has(id)))
  },
  { deep: true, immediate: true }
)

let columnCountAnimationFrameId = 0
watch(columnCount, (newCount, oldCount) => {
  if (newCount !== oldCount) {
    cancelAnimationFrame(columnCountAnimationFrameId)
    columnCountAnimationFrameId = requestAnimationFrame(async () => {
      await rebuildHeavy({ regroupColumns: true })
    })
  }
})

watch(windowWidth, () => {
  requestAnimationFrame(() => {
    isLayoutSyncing = true
    velocity = 0

    const oldWidth = columnWidth.value
    const newWidth = currentColumnWidth(columnCount.value)
    const horizontalScale = newWidth / Math.max(1, oldWidth)

    if (horizontalScale !== 1) {
      const imagesPerColumn = Array.from({ length: columnCount.value }, () => 0)
      for (const state of imageStates) imagesPerColumn[state.columnIndex]++

      for (const state of imageStates) {
        const spacingSum = SPACING * (state.cardIndex + 1)
        const contentTop = state.cardTop - spacingSum
        state.cardTop = contentTop * horizontalScale + spacingSum
        state.cardHeight *= horizontalScale
      }

      for (let col = 0; col < cumulativeColumnsHeights.length; col++) {
        const count = imagesPerColumn[col] || 0
        const spacingSumCol = SPACING * Math.max(0, count - 1)
        const contentSum = cumulativeColumnsHeights[col] - spacingSumCol
        cumulativeColumnsHeights[col] = contentSum * horizontalScale + spacingSumCol
      }

      columnWidth.value = newWidth
    }

    baselineContentWidth.value = viewportContentWidth(columnCount.value)
    resizeFactor = 1
    scrollTargets.value = Array.from({ length: columnCount.value }, () => normalizedScrollY)

    requestAnimationFrame(() => {
      isLayoutSyncing = false
    })
  })
})

const calculateImageStates = () => {
  cumulativeColumnsHeights = Array.from({ length: columnCount.value }, () => SPACING)
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

const ensureScrollTargets = () => {
  const previous = scrollTargets.value
  scrollTargets.value = Array.from(
    { length: columnCount.value },
    (_, i) => previous[i] ?? normalizedScrollY
  )
}

const update = () => {
  if (isLayoutSyncing) return

  ensureScrollTargets()

  const middle = (columnCount.value - 1) / 2
  scrollTargets.value = scrollTargets.value.map((previous, i) => {
    const distance = Math.abs(i - middle)
    return lerp(previous, normalizedScrollY, 0.1 - 0.025 * distance)
  })

  const viewportHeight = imageGallery.value?.clientHeight || window.innerHeight
  const viewTop = -VIRTUAL_BUFFER
  const viewBottom = viewportHeight + VIRTUAL_BUFFER

  const columnImageCounts = Array.from({ length: columnCount.value }, () => 0)
  imageStates.forEach((state) => columnImageCounts[state.columnIndex]++)

  const wrapHeights = Array.from({ length: columnCount.value }, (_, i) => {
    const totalSpacing = SPACING * columnImageCounts[i]
    const scalableHeight = cumulativeColumnsHeights[i] - totalSpacing
    return scalableHeight * resizeFactor + totalSpacing
  })

  for (let i = 0; i < imageStates.length; i++) {
    const state = imageStates[i]
    const columnIndex = state.columnIndex
    const wrapHeight = wrapHeights[columnIndex]
    if (wrapHeight <= 0) continue

    const spacingCount = state.cardIndex + 1
    const scaledCardTop = (state.cardTop - SPACING * spacingCount) * resizeFactor
    const constantSpacing = SPACING * spacingCount

    const yWorld = scaledCardTop + constantSpacing + scrollTargets.value[columnIndex] * resizeFactor

    const minY = -state.cardHeight * resizeFactor
    const totalSpacing = SPACING * columnImageCounts[columnIndex]
    const scalableMaxY =
      (cumulativeColumnsHeights[columnIndex] - totalSpacing - state.cardHeight) * resizeFactor
    const maxY = scalableMaxY + totalSpacing

    const yWrapped = gsap.utils.wrap(minY, maxY, yWorld)

    const scaledHeight = state.cardHeight * resizeFactor
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

const handleWheel = (event) => {
  event.preventDefault?.()
  const deltaY = clamp(event.deltaY, -100, 100)
  normalizedScrollY -= deltaY / resizeFactor
  velocity += (-deltaY / resizeFactor) * WHEEL_IMPULSE
  velocity = clamp(velocity, -MAX_SPEED, MAX_SPEED)
}

const handleDragStart = (event) => {
  event.preventDefault?.()
  dragStartY = event.clientY || event.touches?.[0]?.clientY || 0
  isDragging.value = true
  lastDragTimestamp = performance.now()
  velocity = 0
}

const handleDragMove = (event) => {
  event.preventDefault?.()
  if (!isDragging.value) return
  const currentY = event.clientY || event.touches?.[0]?.clientY || dragStartY
  const deltaY = (currentY - dragStartY) * DRAG_FACTOR
  dragStartY = currentY
  normalizedScrollY += deltaY / resizeFactor

  const now = performance.now()
  const dt = Math.max(0.001, (now - lastDragTimestamp) / 1000)
  lastDragTimestamp = now

  const instantaneousVelocity = ((deltaY / resizeFactor) * DRAG_IMPULSE) / dt
  velocity = lerp(velocity, instantaneousVelocity, 0.35)
  velocity = clamp(velocity, -MAX_SPEED, MAX_SPEED)
}

const handleDragEnd = (event) => {
  event.preventDefault?.()
  isDragging.value = false
}

const render = (timestamp = performance.now()) => {
  if (!isRendering) return
  requestAnimationFrame(render)

  if (!lastFrameTimestamp) lastFrameTimestamp = timestamp
  const dt = Math.min(0.05, (timestamp - lastFrameTimestamp) / 1000)
  lastFrameTimestamp = timestamp

  if (!isLayoutSyncing && !isDragging.value) {
    normalizedScrollY += velocity * dt
    const decay = Math.exp(-DECAY_PER_SEC * dt)
    velocity *= decay
    velocity = clamp(velocity, -MAX_SPEED, MAX_SPEED)
    if (Math.abs(velocity) < VELOCITY_THRESHOLD) velocity = 0
  }

  resizeFactor = viewportContentWidth(columnCount.value) / baselineContentWidth.value
  update()
}

const startRenderLoopOnce = () => {
  if (isRendering) return
  isRendering = true
  requestAnimationFrame(render)
}

const rebuildHeavy = async ({ regroupColumns = true } = {}) => {
  isLayoutSyncing = true
  velocity = 0

  scrollTargets.value = []
  columnWidth.value = currentColumnWidth(columnCount.value)
  baselineContentWidth.value = viewportContentWidth(columnCount.value)
  resizeFactor = 1

  if (regroupColumns) populateImageGroups()
  await nextTick()
  calculateImageStates()
  hideAllImages()

  requestAnimationFrame(() => {
    isLayoutSyncing = false
  })
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
  if (allImagesLoaded.value) {
    nextTick(async () => {
      await rebuildHeavy({ regroupColumns: false })
      startRenderLoopOnce()
    })
  }
}

onMounted(() => {
  columnWidth.value = currentColumnWidth(columnCount.value)
  baselineContentWidth.value = viewportContentWidth(columnCount.value)
})
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
      v-for="(group, index) in groupedImages"
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
</template>

<style lang="scss">
.test {
  display: flex;
  position: fixed;
  left: 0;
  right: 0;
}

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
</style>
