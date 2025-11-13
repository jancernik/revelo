<script setup>
import { useElementSize } from "#src/composables/useElementSize"
import { getThumbnailPath } from "#src/utils/helpers"
import { clamp, lerp } from "#src/utils/helpers"
import { gsap } from "gsap"
import { computed, nextTick, ref, useTemplateRef, watch } from "vue"

const DRAG_FACTOR = 1.5
const WHEEL_IMPULSE = 5.0
const DRAG_IMPULSE = 1.0
const VELOCITY_DECAY = 4.0
const MAX_SPEED = 2000
const VELOCITY_THRESHOLD = 4
const MAX_SCROLL_DELTA = 80
const SCROLL_LERP = 0.1
const VELOCITY_LERP_FACTOR = 0.35
const MAX_DELTA_TIME = 0.05
const MIN_DELTA_TIME = 0.001

const SPACING = 12
const ITEM_SIZE = 50
const ITEM_SIZE_PX = `${ITEM_SIZE}px`
const TOTAL_ITEM_WIDTH = ITEM_SIZE + SPACING

let lastFrameTimestamp = 0
let lastDragTimestamp = 0
let scrollPosition = 0
let dragStartPosition = 0
let scrollTarget = 0
let renderLoopId = 0
let initializationId = 0

const props = defineProps({
  collection: {
    required: true,
    type: Object
  },
  currentImageId: {
    default: null,
    type: String
  }
})

const emit = defineEmits(["click"])

const collectionImages = useTemplateRef("collection-images")
const collectionContainer = useTemplateRef("collection-container")
const { width: containerWidth } = useElementSize(collectionContainer)

const isDragging = ref(false)
const hasDragged = ref(false)
const velocity = ref(0)
const imageElements = ref([])
const isInitializing = ref(false)

const images = computed(() => props.collection?.images || [])
const imageCount = computed(() => images.value.length)

const shouldInitialize = computed(() => {
  return !!(containerWidth.value && imageCount.value && collectionContainer.value)
})

const contentWidth = computed(() => {
  if (!imageCount.value) return 0
  return imageCount.value * TOTAL_ITEM_WIDTH - SPACING
})

const canInfiniteScroll = computed(() => {
  if (!containerWidth.value || !imageCount.value) return false
  return contentWidth.value > containerWidth.value + TOTAL_ITEM_WIDTH
})

const centerOffset = computed(() => {
  if (canInfiniteScroll.value) return 0
  return Math.max(0, (containerWidth.value - contentWidth.value) / 2)
})

const maxScrollDistance = computed(() => {
  if (canInfiniteScroll.value) return Infinity
  return Math.max(0, contentWidth.value - containerWidth.value)
})

const calculatePosition = (index) => {
  const basePosition = index * TOTAL_ITEM_WIDTH + scrollTarget + centerOffset.value

  if (canInfiniteScroll.value) {
    const wrapWidth = imageCount.value * TOTAL_ITEM_WIDTH
    const minY = -TOTAL_ITEM_WIDTH
    const maxY = wrapWidth - TOTAL_ITEM_WIDTH
    return gsap.utils.wrap(minY, maxY, basePosition)
  }

  return basePosition
}

const getBoundedScrollPosition = (targetPosition) => {
  if (canInfiniteScroll.value) return targetPosition
  return clamp(targetPosition, -maxScrollDistance.value, 0)
}

const updateScrollTarget = () => {
  scrollTarget = lerp(scrollTarget, scrollPosition, SCROLL_LERP)
}

const updateImagePositions = () => {
  updateScrollTarget()

  const viewLeft = -TOTAL_ITEM_WIDTH
  const viewRight = containerWidth.value + TOTAL_ITEM_WIDTH

  for (let i = 0; i < imageElements.value.length; i++) {
    const element = imageElements.value[i]
    if (!element) continue

    const position = calculatePosition(i)

    let isVisible = true
    if (canInfiniteScroll.value) {
      isVisible = position >= viewLeft && position <= viewRight
    }

    if (isVisible && element.style.visibility === "hidden") {
      element.style.visibility = "visible"
    } else if (!isVisible && element.style.visibility !== "hidden") {
      element.style.visibility = "hidden"
    }

    if (isVisible) {
      gsap.set(element, { x: position })
    }
  }
}

const updateVelocity = (deltaTime) => {
  if (!isDragging.value) {
    const newScrollPosition = scrollPosition + velocity.value * deltaTime
    scrollPosition = getBoundedScrollPosition(newScrollPosition)

    const velocityDecay = Math.exp(-VELOCITY_DECAY * deltaTime)
    velocity.value = clamp(velocity.value * velocityDecay, -MAX_SPEED, MAX_SPEED)
    if (Math.abs(velocity.value) < VELOCITY_THRESHOLD) velocity.value = 0
  }
}

const startRenderLoop = () => {
  if (renderLoopId) return
  lastFrameTimestamp = performance.now()
  renderLoopId = requestAnimationFrame(renderFrame)
}

const stopRenderLoop = () => {
  if (!renderLoopId) return
  cancelAnimationFrame(renderLoopId)
  renderLoopId = 0
  lastFrameTimestamp = 0
}

const isRenderLoopIdle = () => {
  if (isDragging.value) return false

  const scrollTargetSettled = Math.abs(scrollTarget - scrollPosition) < 0.5
  const velocitySettled = Math.abs(velocity.value) < VELOCITY_THRESHOLD
  return scrollTargetSettled && velocitySettled
}

const renderFrame = (timestamp) => {
  renderLoopId = requestAnimationFrame(renderFrame)

  const deltaTime = Math.min(MAX_DELTA_TIME, (timestamp - (lastFrameTimestamp || timestamp)) / 1000)
  lastFrameTimestamp = timestamp

  updateVelocity(deltaTime)
  updateImagePositions()

  if (isRenderLoopIdle()) stopRenderLoop()
}

const initializeElements = async () => {
  if (isInitializing.value) return
  if (!shouldInitialize.value) return

  const currentId = ++initializationId
  isInitializing.value = true

  try {
    await nextTick()
    if (currentId !== initializationId) return

    const newElements = Array.from(collectionContainer.value?.children || [])

    const elementsChanged =
      newElements.length !== imageElements.value.length ||
      newElements.some((el, i) => el !== imageElements.value[i])

    if (elementsChanged) {
      imageElements.value = newElements

      for (const element of imageElements.value) {
        element.style.position = "absolute"
        element.style.visibility = "hidden"
        element.style.willChange = "transform"
      }
    }

    if (props.currentImageId && elementsChanged) {
      scrollTo(props.currentImageId, false)
    }

    updateImagePositions()
    startRenderLoop()
  } finally {
    if (currentId === initializationId) {
      isInitializing.value = false
    }
  }
}

const handleWheel = (event) => {
  event.preventDefault()

  let deltaX = 0
  if (event.deltaX !== undefined) {
    deltaX = event.deltaX
  } else if (event.wheelDeltaX !== undefined) {
    deltaX = -event.wheelDeltaX
  }

  let deltaY = 0
  if (event.deltaY !== undefined) {
    deltaY = event.deltaY
  } else if (event.wheelDeltaY !== undefined) {
    deltaY = -event.wheelDeltaY
  } else if (event.wheelDelta !== undefined) {
    deltaY = -event.wheelDelta
  }

  const hasHorizontalScroll = Math.abs(deltaX) > Math.abs(deltaY)
  const delta = hasHorizontalScroll ? deltaX : deltaY
  const clampedDelta = clamp(delta, -MAX_SCROLL_DELTA, MAX_SCROLL_DELTA)

  const newScrollPosition = scrollPosition - clampedDelta
  scrollPosition = getBoundedScrollPosition(newScrollPosition)
  velocity.value += clamp(-clampedDelta * WHEEL_IMPULSE, -MAX_SPEED, MAX_SPEED)
  startRenderLoop()
}

const handleDragStart = (event) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  hasDragged.value = false
  dragStartPosition = event.clientX || event.touches?.[0]?.clientX || 0
  lastDragTimestamp = performance.now()
  velocity.value = 0
}

const handleDragMove = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (!isDragging.value) return
  const currentX = event.clientX || event.touches?.[0]?.clientX || dragStartPosition
  const deltaX = (currentX - dragStartPosition) * DRAG_FACTOR

  if (Math.abs(deltaX) > 2) hasDragged.value = true

  dragStartPosition = currentX
  const newScrollPosition = scrollPosition + deltaX
  scrollPosition = getBoundedScrollPosition(newScrollPosition)

  const now = performance.now()
  const deltaTime = Math.max(MIN_DELTA_TIME, (now - lastDragTimestamp) / 1000)
  lastDragTimestamp = now

  const instantaneousVelocity = (deltaX * DRAG_IMPULSE) / deltaTime
  velocity.value = clamp(
    lerp(velocity.value, instantaneousVelocity, VELOCITY_LERP_FACTOR),
    -MAX_SPEED,
    MAX_SPEED
  )
  startRenderLoop()
}

const handleDragEnd = (event) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = false
  setTimeout(() => (hasDragged.value = false), 50)
}

const scrollTo = (id, animated = true) => {
  if (!id || !containerWidth.value) return

  const targetIndex = images.value.findIndex((image) => image.id === id)
  if (targetIndex === -1) return

  const targetImageCenter = targetIndex * TOTAL_ITEM_WIDTH + ITEM_SIZE / 2
  const containerCenter = containerWidth.value / 2
  let targetScrollPosition = -(targetImageCenter - containerCenter)

  if (canInfiniteScroll.value && animated) {
    const wrapWidth = imageCount.value * TOTAL_ITEM_WIDTH
    const currentPos = scrollPosition

    const normalizePosition = (pos) => ((pos % wrapWidth) + wrapWidth) % wrapWidth

    const currentNormalized = normalizePosition(currentPos)
    const targetNormalized = normalizePosition(targetScrollPosition)

    let backwardDistance, forwardDistance

    if (targetNormalized >= currentNormalized) {
      forwardDistance = targetNormalized - currentNormalized
      backwardDistance = currentNormalized + (wrapWidth - targetNormalized)
    } else {
      forwardDistance = wrapWidth - currentNormalized + targetNormalized
      backwardDistance = currentNormalized - targetNormalized
    }

    if (forwardDistance <= backwardDistance) {
      targetScrollPosition = currentPos + forwardDistance
    } else {
      targetScrollPosition = currentPos - backwardDistance
    }

    scrollPosition = targetScrollPosition
  } else if (canInfiniteScroll.value) {
    scrollPosition = targetScrollPosition
  } else {
    scrollPosition = getBoundedScrollPosition(targetScrollPosition)
  }

  if (!animated) scrollTarget = scrollPosition

  velocity.value = 0
  startRenderLoop()
}

const handleClick = (event, image) => {
  event.stopPropagation()
  if (hasDragged.value) {
    event.preventDefault()
    return
  }
  emit("click", event, image)
}

watch(shouldInitialize, (init) => init && initializeElements(), { immediate: true })

watch(containerWidth, () => {
  if (imageElements.value.length > 0) {
    updateImagePositions()
  }
})

watch(canInfiniteScroll, () => {
  if (shouldInitialize.value) {
    const preservedPosition = scrollPosition

    initializeElements().then(() => {
      scrollPosition = getBoundedScrollPosition(preservedPosition)
      scrollTarget = scrollPosition
      updateImagePositions()
    })
  }
})

defineExpose({ collectionImages, scrollTo })
</script>

<template>
  <div
    ref="collection-images"
    class="collection-images"
    :class="{ dragging: isDragging, infinite: canInfiniteScroll }"
    @wheel="handleWheel"
    @touchstart="handleDragStart"
    @touchmove="handleDragMove"
    @touchend="handleDragEnd"
    @mousedown="handleDragStart"
    @mousemove="handleDragMove"
    @mouseleave="handleDragEnd"
    @mouseup="handleDragEnd"
  >
    <div ref="collection-container" class="collection-container">
      <div
        v-for="image in images"
        :key="image.id"
        class="thumbnail-item"
        :class="{ active: image.id === currentImageId }"
        @click="handleClick($event, image)"
        @touchend="handleClick($event, image)"
      >
        <img :src="getThumbnailPath(image)" />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
$item-size: v-bind(ITEM_SIZE_PX);

.collection-images {
  background: var(--background);
  padding: var(--spacing-2);
  position: relative;
  user-select: none;
  overflow: hidden;

  &.dragging,
  &.dragging .thumbnail-item {
    cursor: grabbing;
  }

  .collection-container {
    position: relative;
    height: $item-size;
  }

  &::after,
  &::before {
    content: "";
    position: absolute;
    top: 0;
    width: clamp(15%, 60px, 100px);
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: 0.15s ease-in-out;
  }

  &::before {
    left: 0;
    background-image: linear-gradient(to left, transparent, var(--background));
  }

  &::after {
    right: 0;
    background-image: linear-gradient(to right, transparent, var(--background));
  }

  &.infinite {
    &::after,
    &::before {
      opacity: 1;
    }
  }
}

.thumbnail-item {
  width: $item-size;
  height: $item-size;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  position: absolute;
  visibility: hidden;
  will-change: transform;
  position: absolute;

  &.active {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
