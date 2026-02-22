import { useAdaptiveFrameRate } from "#src/composables/useAdaptiveFrameRate"
import { clamp } from "#src/utils/helpers"
import { ref } from "vue"

const MAX_DRAG_PROGRESS = 0.99 // Maximum progress (0-1) that can be reached while dragging to prevent auto-commit
const DRAG_MOVEMENT_THRESHOLD = 10 // Minimum pixel movement to consider it a drag vs a tap

export function useDragNavigation({
  createSlideTimeline,
  getNextImage,
  getPreviousImage,
  hasCollection,
  isAnimating,
  isMobileLayout,
  metadataVisible,
  windowWidth
}) {
  const isDragging = ref(false)
  const hasDragMovement = ref(false)
  const slideProgress = ref(0)
  const dragStartPosition = ref(0)
  const rightTransitionTimeline = ref(null)
  const leftTransitionTimeline = ref(null)
  const initialProgress = ref(0)
  const activeTimelineOnInterrupt = ref(null)
  const isSwitchingImage = ref(false)

  const frameRateAdapter = useAdaptiveFrameRate()
  let lastDragTimestamp = 0

  const resetDragState = () => {
    isDragging.value = false
    setTimeout(() => (hasDragMovement.value = false), 0)
    initialProgress.value = 0
    dragStartPosition.value = 0
    activeTimelineOnInterrupt.value = null
  }

  const handleDragStart = (event) => {
    if (metadataVisible.value && isMobileLayout.value) return

    const target = event.target
    const isImage = target.classList?.contains("image")
    const isInteractiveElement =
      target.closest("button") ||
      target.closest(".floating-controls") ||
      target.closest(".image-metadata") ||
      target.closest(".collection-images")
    const isTouchEvent = event.type.startsWith("touch")

    if (isInteractiveElement && !isImage) return

    if (!isTouchEvent) {
      event.preventDefault()
    } else if (!isImage) {
      event.preventDefault()
    }

    if (isAnimating.value || !hasCollection.value) return
    isDragging.value = true
    dragStartPosition.value = event.clientX ?? event.touches?.[0]?.clientX ?? 0

    if (leftTransitionTimeline.value || rightTransitionTimeline.value) {
      leftTransitionTimeline.value?.paused(true)
      rightTransitionTimeline.value?.paused(true)
      initialProgress.value = slideProgress.value

      if (slideProgress.value > 0) {
        activeTimelineOnInterrupt.value = "right"
      } else if (slideProgress.value < 0) {
        activeTimelineOnInterrupt.value = "left"
      }

      isSwitchingImage.value = false
    } else {
      activeTimelineOnInterrupt.value = null
    }
  }

  const handleDragMove = async (event) => {
    if (!isDragging.value) return

    const currentX = event.clientX ?? event.touches?.[0]?.clientX
    if (currentX === undefined) return

    const deltaX = dragStartPosition.value - currentX

    if (!hasDragMovement.value && Math.abs(deltaX) > DRAG_MOVEMENT_THRESHOLD) {
      hasDragMovement.value = true
    }

    if (hasDragMovement.value) event.preventDefault()
    if (!hasDragMovement.value) return
    if (isSwitchingImage.value) return

    if (frameRateAdapter.shouldSkipFrame(event.timeStamp, lastDragTimestamp)) {
      lastDragTimestamp = event.timeStamp
      return
    }

    lastDragTimestamp = event.timeStamp

    const dragProgress = deltaX / (windowWidth.value / 1.5)

    if (activeTimelineOnInterrupt.value) {
      const activeTimeline =
        activeTimelineOnInterrupt.value === "right"
          ? rightTransitionTimeline.value
          : leftTransitionTimeline.value

      if (activeTimeline) {
        const newProgress =
          activeTimelineOnInterrupt.value === "right"
            ? Math.abs(initialProgress.value) + dragProgress
            : Math.abs(initialProgress.value) - dragProgress

        const clampedProgress = clamp(newProgress, 0, MAX_DRAG_PROGRESS)
        activeTimeline.progress(clampedProgress)

        if (clampedProgress === 0) {
          if (activeTimelineOnInterrupt.value === "right" && dragProgress < -0.1) {
            activeTimelineOnInterrupt.value = "left"
            if (!leftTransitionTimeline.value) {
              const targetImage = getPreviousImage()
              if (targetImage) leftTransitionTimeline.value = createSlideTimeline(targetImage, -1)
            }
            initialProgress.value = 0
          } else if (activeTimelineOnInterrupt.value === "left" && dragProgress > 0.1) {
            activeTimelineOnInterrupt.value = "right"
            if (!rightTransitionTimeline.value) {
              const targetImage = getNextImage()
              if (targetImage) rightTransitionTimeline.value = createSlideTimeline(targetImage, 1)
            }
            initialProgress.value = 0
          }
        }
      }
    } else {
      const direction = deltaX > 0 ? 1 : -1

      if (direction === 1 && !rightTransitionTimeline.value) {
        const targetImage = getNextImage()
        if (targetImage) rightTransitionTimeline.value = createSlideTimeline(targetImage, 1)
      } else if (direction === -1 && !leftTransitionTimeline.value) {
        const targetImage = getPreviousImage()
        if (targetImage) leftTransitionTimeline.value = createSlideTimeline(targetImage, -1)
      }

      const progress = dragProgress - initialProgress.value
      const clampedProgress = clamp(progress, -MAX_DRAG_PROGRESS, MAX_DRAG_PROGRESS)

      if (clampedProgress > 0 && rightTransitionTimeline.value) {
        rightTransitionTimeline.value.progress(Math.abs(clampedProgress))
        leftTransitionTimeline.value?.progress(0)
      } else if (clampedProgress < 0 && leftTransitionTimeline.value) {
        leftTransitionTimeline.value.progress(Math.abs(clampedProgress))
        rightTransitionTimeline.value?.progress(0)
      } else if (clampedProgress === 0) {
        leftTransitionTimeline.value?.progress(0)
        rightTransitionTimeline.value?.progress(0)
      }
    }
  }

  const handleDragEnd = (event) => {
    if (!isDragging.value) return

    if (hasDragMovement.value) event.preventDefault()

    if (isSwitchingImage.value) {
      resetDragState()
      setTimeout(() => (isSwitchingImage.value = false), 0)
      return
    }

    if (!leftTransitionTimeline.value && !rightTransitionTimeline.value) {
      isDragging.value = false
      setTimeout(() => (hasDragMovement.value = false), 0)
      activeTimelineOnInterrupt.value = null
      return
    }

    const progress = slideProgress.value
    const targetTimeline =
      progress > 0 ? rightTransitionTimeline.value : leftTransitionTimeline.value

    isSwitchingImage.value = true
    if (Math.abs(progress) >= 0.1) {
      targetTimeline?.play()
    } else {
      targetTimeline?.reverse()
    }

    resetDragState()
  }

  return {
    handleDragEnd,
    handleDragMove,
    handleDragStart,
    hasDragMovement,
    isDragging,
    isSwitchingImage,
    leftTransitionTimeline,
    rightTransitionTimeline,
    slideProgress
  }
}
