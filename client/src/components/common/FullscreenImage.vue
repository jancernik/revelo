<script setup>
import Icon from "#src/components/common/Icon.vue"
import CollectionImages from "#src/components/images/CollectionImages.vue"
import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { useElementSize } from "#src/composables/useElementSize"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useCollectionsStore } from "#src/stores/collections.js"
import { calculateImageAspectRatio } from "#src/utils/galleryHelpers"
import { clamp, cssVar } from "#src/utils/helpers"
import { getImageVersion } from "#src/utils/helpers"
import { gsap } from "gsap"
import { Flip } from "gsap/Flip"
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue"
import { useRouter } from "vue-router"

const FLIP_DURATION = 0.6 // Duration for FLIP animation when transitioning between thumbnail and fullscreen
const FLIP_EASE = "power2.inOut" // Easing function for FLIP animation transitions
const REGULAR_DURATION = 0.4 // Duration for fallback fade/scale animation when no thumbnail available
const REGULAR_EASE = "power3.inOut" // Easing function for fallback animations
const REGULAR_SCALE = 0.85 // Initial scale factor for fallback show/hide animations
const SLIDE_EASE = "power2.inOut" // Easing function for metadata/collection slide animations
const SLIDE_DURATION = 0.4 // Duration for metadata/collection slide animations
const SPACING_BASE = 20 // Spacing offset in pixels for slide animations
const SPACING_SMALL = 8 // Spacing offset in pixels for narrow screens
const SPACING_BREAKPOINT = 700 // Screen width threshold for switching to small spacing
const MAX_DRAG_PROGRESS = 0.99 // Maximum progress (0-1) that can be reached while dragging to prevent auto-commit
const DRAG_MOVEMENT_THRESHOLD = 10 // Minimum pixel movement to consider it a drag vs a tap
const SLIDE_IMAGE_BUFFER = 5 // Extra pixels to position slide image beyond viewport edge
const CONTROLS_SHOW_DELAY = 150 // Delay in ms before showing floating controls after animation starts

const METADATA_FIELDS = [
  "camera",
  "lens",
  "aperture",
  "shutterSpeed",
  "iso",
  "focalLength",
  "focalLengthEquivalent",
  "date"
]

const SHOW_DEBUG_INFO = false // Toggle display of debug information

const {
  callOnReturn,
  callUpdatePositions,
  completeHide,
  flipId,
  imageChanged,
  imageData,
  imageRestoredToOriginal,
  isAnimating,
  isThumbnailVisible,
  setPopstateCallback,
  triggerHide,
  updateRoute
} = useFullscreenImage()
const router = useRouter()
const collectionsStore = useCollectionsStore()
const { hide: hideMenu } = useMenu()

const collectionData = ref(null)
const metadataVisible = ref(false)
const collectionVisible = ref(false)
const initialMetadataWidth = ref(0)
const isSettingInitialWidth = ref(false)
const originalFlipId = ref(null)
const isSwitchingImage = ref(false)
const leftSlideImagePath = ref("")
const rightSlideImagePath = ref("")
const isAnimatingMetadata = ref(false)
const isDragging = ref(false)
const slideProgress = ref(0)
const hasDragMovement = ref(false)

const dragStartPosition = ref(0)
const rightTransitionTimeline = ref(null)
const leftTransitionTimeline = ref(null)
const initialProgress = ref(0)
const activeTimelineOnInterrupt = ref(null)

const fullscreenContainerElement = useTemplateRef("fullscreen-image-container")
const fullscreenElement = useTemplateRef("fullscreen-image")
const fullscreenImageElement = computed(() => fullscreenElement.value?.querySelector(".image"))
const fallbackImageElement = computed(() => fullscreenElement.value?.querySelector(".fallback"))
const leftSlideImageElement = useTemplateRef("left-slide-image")
const rightSlideImageElement = useTemplateRef("right-slide-image")
const thumbnailElement = computed(() => document.querySelector(`[data-flip-id="${flipId.value}"]`))
const thumbnailImageElement = computed(() => thumbnailElement.value?.querySelector("img"))
const imageMetadataRef = useTemplateRef("image-metadata")
const imageMetadataElement = computed(() => imageMetadataRef.value?.$el)
const collectionRef = useTemplateRef("collection-images")
const collectionElement = computed(() => collectionRef.value?.$el)
const leftControlsRef = useTemplateRef("left-controls")
const rightControlsRef = useTemplateRef("right-controls")

const regularImageVersion = computed(() => getImageVersion(imageData.value, "regular"))
const thumbnailImageVersion = computed(() => getImageVersion(imageData.value, "thumbnail"))
const imageAspectRatio = computed(() => calculateImageAspectRatio(imageData.value))

const { height: windowHeight, width: windowWidth } = useWindowSize()
const { height: imageHeight } = useElementSize(fullscreenElement)
const { height: collectionHeight } = useElementSize(collectionElement)

const spacing = computed(() =>
  windowWidth.value < SPACING_BREAKPOINT ? SPACING_SMALL : SPACING_BASE
)
const spacingPx = computed(() => `${spacing.value}px`)

const isMobileLayout = computed(() => {
  if (windowWidth.value <= 576) return true
  const availableSpace = windowWidth.value - spacing.value * 2 - initialMetadataWidth.value
  if (imageAspectRatio.value < 1) {
    if (initialMetadataWidth.value > availableSpace * (2 / 3)) {
      return true
    }
  } else {
    if (initialMetadataWidth.value > availableSpace * (1 / 2)) {
      return true
    }
  }
  return false
})

const imageHasMetadata = (image) => METADATA_FIELDS.some((k) => image?.[k])
const hasMetadata = computed(() => METADATA_FIELDS.some((k) => imageData?.value?.[k]))
const hasCollection = computed(() => collectionData?.value?.images?.length > 0)

const hasThumbnailAvailable = () => {
  if (!flipId.value) return false
  if (!thumbnailElement.value) return false
  return !!isThumbnailVisible.value?.()
}

const getThumbnailBorderRadius = () => {
  if (!thumbnailElement.value) return 0
  const styles = window.getComputedStyle(thumbnailElement.value)
  return parseFloat(styles.borderRadius) || 0
}

const getScaleRatio = () => {
  if (!thumbnailElement.value || !fullscreenElement.value) return 1

  const thumbnailRect = thumbnailElement.value.getBoundingClientRect()
  const imageRect = fullscreenElement.value.getBoundingClientRect()

  const thumbnailSize = Math.min(thumbnailRect.width, thumbnailRect.height)
  const imageSize = Math.min(imageRect.width, imageRect.height)

  return thumbnailSize / imageSize
}

const getAvailableImageSpace = (options = {}) => {
  const { collectionVisible = false, metadataVisible = false } = options

  let availableWidth = windowWidth.value - spacing.value * 2
  let availableHeight = windowHeight.value - spacing.value * 2

  if (metadataVisible && !isMobileLayout.value) {
    availableWidth -= initialMetadataWidth.value + spacing.value
  }

  if (collectionVisible) {
    availableHeight -= collectionHeight.value + spacing.value
  }

  return { height: availableHeight, width: availableWidth }
}

const calculateOptimalImageSize = (options = {}) => {
  const { aspectRatio = null, collectionVisible = false, metadataVisible = false } = options

  const targetAspectRatio = aspectRatio || imageAspectRatio.value
  if (!targetAspectRatio) return { height: "auto", width: "auto" }

  const { height: maxHeight, width: maxWidth } = getAvailableImageSpace({
    collectionVisible,
    metadataVisible
  })

  let height, width

  if (maxWidth / targetAspectRatio <= maxHeight) {
    width = maxWidth
    height = maxWidth / targetAspectRatio
  } else {
    height = maxHeight
    width = maxHeight * targetAspectRatio
  }

  return { height: `${height}px`, width: `${width}px` }
}

const maxImageHeight = (collectionVisible) => {
  if (!collectionVisible) return `calc(100vh - calc(${spacingPx.value} * 2))`
  const availableVh = 100 - ((collectionHeight.value + spacing.value) / windowHeight.value) * 100
  return `calc(${availableVh}vh - calc(${spacingPx.value} * 2))`
}

const maxImageWidth = (metadataVisible) => {
  if (!metadataVisible || isMobileLayout.value) return `calc(100vw - calc(${spacingPx.value} * 2))`
  const availableVw = 100 - ((initialMetadataWidth.value + spacing.value) / windowWidth.value) * 100
  return `calc(${availableVw}vw - calc(${spacingPx.value} * 2))`
}

const setVisibility = (element, visible) => {
  if (!element) return
  gsap.set(element, { visibility: visible ? "visible" : "hidden" })
}

const setStyles = (elements, styles) => {
  if (!elements) return
  if (Array.isArray(elements)) {
    elements.forEach((el) => el && gsap.set(el, styles))
  } else {
    gsap.set(elements, styles)
  }
}

const createAnimationTimeline = (options = {}) => {
  return gsap.timeline({
    defaults: {
      duration: 0.3,
      ease: SLIDE_EASE
    },
    ...options
  })
}

const showFullscreenElements = () => {
  fullscreenElement.value.style.display = "flex"
  fullscreenContainerElement.value.style.display = "flex"
}

const hideFullscreenElements = () => {
  fullscreenElement.value.style.display = "none"
  fullscreenContainerElement.value.style.display = "none"
}

const setBaseMobileMetadataStyles = (metadataVisible, animate = false) => {
  if (!imageMetadataElement.value) return

  let spacePx = (windowHeight.value - imageHeight.value) / 2
  let metadataOffset = -imageMetadataElement.value.offsetHeight

  if (collectionVisible.value) {
    spacePx += collectionHeight.value + spacing.value
    metadataOffset -= (collectionHeight.value + spacing.value) / 2
  }

  const styles = {
    height: "max-content",
    right: "50%",
    top: `calc(100% + ${spacePx}px`,
    width: "100vw",
    x: "50%",
    y: metadataVisible ? metadataOffset : 0
  }

  if (animate) {
    return gsap.to(imageMetadataElement.value, {
      ...styles,
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE
    })
  } else {
    setStyles(imageMetadataElement.value, styles)
  }
}

const setHiddenMetadataStyles = (isMobile) => {
  if (!imageMetadataElement.value) return

  imageMetadataElement.value.style.zIndex = isMobile ? 1 : -1

  setStyles(imageMetadataElement.value, {
    height: isMobile ? "max-content" : "100%",
    right: 0,
    top: 0,
    width: "max-content",
    x: 0,
    y: 0
  })

  isSettingInitialWidth.value = true
  nextTick(() => {
    if (imageMetadataElement.value) {
      initialMetadataWidth.value = imageMetadataElement.value.offsetWidth
    }
    isSettingInitialWidth.value = false
  })

  if (isMobile) {
    setBaseMobileMetadataStyles(false)
  }

  setStyles(fullscreenElement.value, { x: 0 })
  const { height, width } = calculateOptimalImageSize({
    collectionVisible: collectionVisible.value,
    metadataVisible: false
  })
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], { height, width })
}

const onHideComplete = () => {
  isAnimating.value = false
  metadataVisible.value = false
  collectionVisible.value = false
  originalFlipId.value = null
  hideFullscreenElements()
  completeHide()
}

const showWithFlipAnimation = () => {
  if (!thumbnailElement.value) {
    showWithRegularAnimation()
    return
  }

  let performCalled = false

  const perform = () => {
    if (performCalled || !thumbnailElement.value) return
    performCalled = true

    const borderRadius = getThumbnailBorderRadius()
    const scaleRatio = getScaleRatio()
    const scaledBorderRadius = borderRadius / scaleRatio

    fallbackImageElement.value.style.borderRadius = `${scaledBorderRadius}px`
    fullscreenImageElement.value.style.borderRadius = `${scaledBorderRadius}px`
    fullscreenElement.value.style.borderRadius = `${scaledBorderRadius}px`

    const state = Flip.getState([thumbnailElement.value, fullscreenElement.value])

    thumbnailElement.value.style.visibility = "hidden"

    setStyles(fullscreenElement.value, { opacity: 1 })
    setStyles(fallbackImageElement.value, { opacity: 1, visibility: "visible" })
    setStyles(fullscreenImageElement.value, { opacity: 0, visibility: "visible" })

    Flip.from(state, {
      duration: FLIP_DURATION,
      ease: FLIP_EASE,
      onComplete: () => {
        if (fullscreenImageElement.value.complete) {
          gsap.to(fullscreenImageElement.value, {
            duration: 0.3,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating.value = false
            },
            opacity: 1
          })
        } else {
          fullscreenImageElement.value.onload = () => {
            gsap.to(fullscreenImageElement.value, {
              duration: 0.3,
              ease: "power2.inOut",
              onComplete: () => {
                isAnimating.value = false
              },
              opacity: 1
            })
          }
        }
      },
      scale: true
    })

    setTimeout(() => showFloatingControls(), CONTROLS_SHOW_DELAY)

    gsap.to([fullscreenImageElement.value, fallbackImageElement.value, fullscreenElement.value], {
      borderRadius: cssVar("--radius-lg"),
      duration: FLIP_DURATION,
      ease: FLIP_EASE
    })
  }

  showFullscreenElements()
  setStyles(fullscreenElement.value, { opacity: 0 })
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], {
    maxHeight: maxImageHeight(false),
    maxWidth: maxImageWidth(false),
    visibility: "hidden"
  })

  // Start performing as soon as fallback (thumbnail) is loaded
  if (fallbackImageElement.value.complete) {
    perform()
  } else {
    fallbackImageElement.value.onload = perform
  }
}

const hideWithFlipAnimation = () => {
  if (!thumbnailElement.value) {
    hideWithRegularAnimation()
    return
  }

  callUpdatePositions()

  const borderRadius = getThumbnailBorderRadius()
  const scaleRatio = getScaleRatio()
  const scaledBorderRadius = borderRadius * scaleRatio

  const state = Flip.getState([thumbnailElement.value, fullscreenElement.value])

  fullscreenElement.value.style.display = "none"
  thumbnailElement.value.style.visibility = "visible"

  Flip.from(state, {
    duration: FLIP_DURATION,
    ease: FLIP_EASE,
    onComplete: onHideComplete,
    opacity: 1,
    scale: true
  })

  gsap.from([thumbnailElement.value, thumbnailImageElement.value], {
    borderRadius: `${scaledBorderRadius}px`,
    duration: FLIP_DURATION,
    ease: FLIP_EASE
  })

  callOnReturn(true)
}

const showWithRegularAnimation = () => {
  showFullscreenElements()
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], {
    maxHeight: maxImageHeight(false),
    maxWidth: maxImageWidth(false),
    visibility: "visible"
  })

  gsap.fromTo(
    fullscreenElement.value,
    { filter: "blur(15px)", opacity: 0, scale: REGULAR_SCALE },
    {
      duration: REGULAR_DURATION,
      ease: REGULAR_EASE,
      filter: "blur(0px)",
      onComplete: () => {
        isAnimating.value = false
      },
      opacity: 1,
      scale: 1
    }
  )

  setTimeout(() => showFloatingControls(), CONTROLS_SHOW_DELAY)
}

const hideWithRegularAnimation = () => {
  gsap.to(fullscreenElement.value, {
    duration: REGULAR_DURATION,
    ease: REGULAR_EASE,
    filter: "blur(15px)",
    onComplete: onHideComplete,
    opacity: 0,
    scale: REGULAR_SCALE
  })
}

const showImage = (forceRegularAnimation = false) => {
  if (isAnimating.value) return
  isAnimating.value = true

  hideMenu(!!flipId.value)

  const { height, width } = calculateOptimalImageSize({
    collectionVisible: collectionVisible.value,
    metadataVisible: metadataVisible.value
  })
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], { height, width })

  if (hasThumbnailAvailable() && !forceRegularAnimation) {
    showWithFlipAnimation()
  } else {
    showWithRegularAnimation()
  }
}

const hideImage = async () => {
  if (isAnimating.value) return
  isAnimating.value = true

  if (metadataVisible.value) {
    gsap.to(imageMetadataElement.value, {
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      filter: "blur(15px)",
      opacity: 0
    })
  }

  if (collectionVisible.value) {
    gsap.to(collectionElement.value, {
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE,
      filter: "blur(15px)",
      opacity: 0
    })
  }
  await hideFloatingControls()

  if (hasThumbnailAvailable()) {
    hideWithFlipAnimation()
    history.pushState({}, "", "/")
  } else {
    callOnReturn(false)
    hideWithRegularAnimation()
    router.push("/")
  }
}

const animateMetadata = (visible, callback) => {
  if (!hasMetadata.value || !imageMetadataElement.value) return

  isAnimatingMetadata.value = true
  metadataVisible.value = !!visible
  if (visible) {
    setHiddenMetadataStyles(isMobileLayout.value)
    setVisibility(imageMetadataElement.value, true)
  }
  const tl = createAnimationTimeline({
    onComplete: () => {
      if (!visible) setVisibility(imageMetadataElement.value, false)
      isAnimatingMetadata.value = false
      callback?.()
    }
  })

  nextTick(() => {
    if (isMobileLayout.value) {
      let metadataOffset = -imageMetadataElement.value.offsetHeight
      if (collectionVisible.value) metadataOffset -= (collectionHeight.value + spacing.value) / 2
      tl.to(imageMetadataElement.value, { y: visible ? metadataOffset : 0 })
    } else {
      const metadataOffset = initialMetadataWidth.value + spacing.value
      const centerOffset = metadataOffset / -2

      tl.to(imageMetadataElement.value, { x: visible ? metadataOffset : 0 }, 0)
      tl.to(fullscreenElement.value, { x: visible ? centerOffset : 0 }, 0)
      const { height, width } = calculateOptimalImageSize({
        collectionVisible: collectionVisible.value,
        metadataVisible: visible
      })
      tl.to([fullscreenImageElement.value, fallbackImageElement.value], { height, width }, 0)
    }
  })
}

const animateCollection = (visible, callback) => {
  if (!hasCollection.value || !collectionElement.value) return

  collectionVisible.value = !!visible
  if (visible) setVisibility(collectionElement.value, true)

  const collectionOffset = -(collectionHeight.value + spacing.value)
  const centerOffset = collectionOffset / 2

  const tl = createAnimationTimeline({
    onComplete: () => {
      if (!visible) setVisibility(collectionElement.value, false)
      callback?.()
    }
  })

  tl.to(collectionElement.value, { y: visible ? collectionOffset : 0 }, 0)
  tl.to(fullscreenElement.value, { y: visible ? centerOffset : 0 }, 0)
  const { height, width } = calculateOptimalImageSize({
    collectionVisible: visible,
    metadataVisible: metadataVisible.value
  })
  tl.to([fullscreenImageElement.value, fallbackImageElement.value], { height, width }, 0)

  if (metadataVisible.value && isMobileLayout.value) {
    tl.add(setBaseMobileMetadataStyles(metadataVisible.value, true), 0)
  }
}

const showFloatingControls = async () => {
  if (!leftControlsRef.value) return

  const promises = []

  const leftPromise = gsap.fromTo(
    leftControlsRef.value,
    { filter: "blur(15px)", opacity: 0 },
    {
      duration: 0.3,
      ease: "power2.out",
      filter: "blur(0px)",
      opacity: 1
    }
  )
  promises.push(leftPromise)

  if (rightControlsRef.value) {
    const rightPromise = gsap.fromTo(
      rightControlsRef.value,
      { filter: "blur(15px)", opacity: 0 },
      {
        duration: 0.3,
        ease: "power2.out",
        filter: "blur(0px)",
        opacity: 1
      }
    )
    promises.push(rightPromise)
  }

  await Promise.all(promises)
}

const showMetadataButton = async () => {
  if (!rightControlsRef.value) return

  await gsap.fromTo(
    rightControlsRef.value,
    { filter: "blur(15px)", opacity: 0, x: 0 },
    {
      duration: 0.3,
      ease: "power2.out",
      filter: "blur(0px)",
      opacity: 1,
      x: 0
    }
  )
}

const hideMetadataButton = async () => {
  if (!rightControlsRef.value) return

  await gsap.to(rightControlsRef.value, {
    duration: 0.3,
    ease: "back.in(1.4)",
    opacity: 0,
    x: 200
  })
}

const hideFloatingControls = async () => {
  if (!leftControlsRef.value) return

  const promises = []

  const leftPromise = gsap.to(leftControlsRef.value, {
    duration: 0.3,
    ease: "back.in(1.4)",
    opacity: 0,
    x: -200
  })
  promises.push(leftPromise)

  if (rightControlsRef.value) {
    promises.push(hideMetadataButton())
  }

  await Promise.all(promises)
}

const showMetadata = (callback) => animateMetadata(true, callback)
const hideMetadata = (callback) => animateMetadata(false, callback)
const showCollection = (callback) => animateCollection(true, callback)
const hideCollection = (callback) => animateCollection(false, callback)

const toggleMetadata = () => (metadataVisible.value ? hideMetadata() : showMetadata())
const toggleCollection = () => (collectionVisible.value ? hideCollection() : showCollection())

const onSlideComplete = async (options) => {
  const { height, targetImage, width } = options
  const previousHadMetadata = hasMetadata.value
  const nextImageHasMetadata = imageHasMetadata(targetImage)

  if (imageMetadataElement.value) {
    metadataVisible.value = false
    setVisibility(imageMetadataElement.value, false)
    setStyles(imageMetadataElement.value, { filter: "blur(0px)", opacity: 1, x: 0 })
    initialMetadataWidth.value = 0
  }

  setStyles(fullscreenElement.value, { x: 0 })
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], {
    filter: "blur(0px)",
    height,
    opacity: 1,
    scale: 1,
    width
  })

  const targetFlipId = `img-${targetImage.id}`
  if (originalFlipId.value && targetFlipId === originalFlipId.value) {
    flipId.value = originalFlipId.value
    originalFlipId.value = null
    imageRestoredToOriginal()
  } else {
    if (originalFlipId.value === null && flipId.value !== null) {
      originalFlipId.value = flipId.value
    }
    flipId.value = null
    imageChanged()
  }

  history.replaceState({}, "", `/images/${targetImage.id}`)
  imageData.value = targetImage

  await nextTick()

  const imageElement = fullscreenImageElement.value
  await new Promise((resolve) => {
    if (imageElement.complete) {
      resolve()
    } else {
      imageElement.onload = resolve
      imageElement.onerror = resolve
    }
  })

  setStyles([leftSlideImageElement.value, rightSlideImageElement.value], {
    left: "0%",
    visibility: "hidden",
    x: 0
  })

  leftSlideImagePath.value = ""
  rightSlideImagePath.value = ""

  if (collectionRef.value?.scrollTo) {
    collectionRef.value.scrollTo(targetImage.id, true)
  }

  if (nextImageHasMetadata && !previousHadMetadata && rightControlsRef.value) {
    await showMetadataButton()
  } else if (!nextImageHasMetadata && previousHadMetadata && rightControlsRef.value) {
    await hideMetadataButton()
  }

  leftTransitionTimeline.value = null
  rightTransitionTimeline.value = null
  slideProgress.value = 0

  if (!isDragging.value) {
    setTimeout(() => (isSwitchingImage.value = false), 0)
  }
}

const createSlideTimeline = (targetImage, direction) => {
  if (!targetImage) return null

  const nextThumbnailVersion = getImageVersion(targetImage, "thumbnail")
  const nextImageAspectRatio = calculateImageAspectRatio(targetImage)

  const { height, width } = calculateOptimalImageSize({
    aspectRatio: nextImageAspectRatio,
    collectionVisible: collectionVisible.value,
    metadataVisible: false
  })

  const nextImageWidth = parseFloat(width)
  const nextImageHeight = parseFloat(height)

  const tl = createAnimationTimeline({
    onComplete: () => onSlideComplete({ height, targetImage, width }),
    onReverseComplete: () => {
      setStyles([leftSlideImageElement.value, rightSlideImageElement.value], {
        left: "0%",
        visibility: "hidden",
        x: 0
      })
      setStyles([fullscreenImageElement.value, fallbackImageElement.value], {
        filter: "blur(0px)",
        opacity: 1,
        scale: 1
      })
      leftSlideImagePath.value = ""
      rightSlideImagePath.value = ""
      leftTransitionTimeline.value = null
      rightTransitionTimeline.value = null
      slideProgress.value = 0
      isSwitchingImage.value = false
    },
    onUpdate: function () {
      slideProgress.value = this.progress() * direction
    },
    paused: true
  })

  const nextImageHasMetadata = imageHasMetadata(targetImage)

  if (hasMetadata.value && !nextImageHasMetadata && rightControlsRef.value) {
    tl.to(
      rightControlsRef.value,
      {
        duration: 0.3,
        ease: "back.in(1.4)",
        opacity: 0,
        x: 200
      },
      0
    )
  }

  if (metadataVisible.value && imageMetadataElement.value) {
    tl.to(
      imageMetadataElement.value,
      {
        filter: "blur(15px)",
        opacity: 0
      },
      0
    )

    if (!isMobileLayout.value) {
      tl.to(fullscreenElement.value, { x: 0 }, 0)
      tl.to(
        [fullscreenImageElement.value, fallbackImageElement.value],
        {
          height,
          width
        },
        0
      )
    }
  }

  const slideImageElement =
    direction === 1 ? rightSlideImageElement.value : leftSlideImageElement.value

  if (slideImageElement) {
    if (direction === 1) {
      rightSlideImagePath.value = nextThumbnailVersion.path
    } else {
      leftSlideImagePath.value = nextThumbnailVersion.path
    }

    let metadataCompensation = 0
    if (metadataVisible.value && !isMobileLayout.value) {
      const metadataOffset = initialMetadataWidth.value + spacing.value
      const centerOffset = metadataOffset / -2
      metadataCompensation = -centerOffset
    }

    const startOffset =
      (windowWidth.value / 2 + nextImageWidth / 2 + SLIDE_IMAGE_BUFFER + metadataCompensation) *
      direction

    setStyles(slideImageElement, {
      height,
      left: "50%",
      top: "50%",
      width,
      x: startOffset - nextImageWidth / 2,
      y: -nextImageHeight / 2
    })
    setVisibility(slideImageElement, true)

    tl.to(
      [fullscreenImageElement.value, fallbackImageElement.value],
      { filter: "blur(15px)", opacity: 0, scale: REGULAR_SCALE },
      0
    )

    tl.to(slideImageElement, { x: -nextImageWidth / 2 }, 0)
  }

  return tl
}

const createPopstateCallback = (animationFn) => () => {
  animationFn()
  history.pushState({}, "", "/")
}

const setupRouting = (imageId) => {
  history.pushState({}, "", `/images/${imageId}`)
  const callback = hasThumbnailAvailable()
    ? createPopstateCallback(hideWithFlipAnimation)
    : createPopstateCallback(hideWithRegularAnimation)
  setPopstateCallback(callback)
}

const getSlideDirection = (image) => {
  let direction = null

  if (!hasCollection.value || !collectionData.value?.images || !image) direction
  const currentIndex = collectionData.value.images.findIndex((i) => i.id === imageData.value?.id)
  const nextIndex = collectionData.value.images.findIndex((i) => i.id === image.id)

  if (currentIndex === -1 || nextIndex === -1) return direction

  if (collectionRef.value?.canInfiniteScroll) {
    const totalImages = collectionData.value.images.length
    const forwardDistance = (nextIndex - currentIndex + totalImages) % totalImages
    const backwardDistance = (currentIndex - nextIndex + totalImages) % totalImages
    direction = forwardDistance <= backwardDistance ? 1 : -1
  } else {
    direction = nextIndex > currentIndex ? 1 : -1
  }
  return direction
}

const getNextImage = () => {
  if (!hasCollection.value || !collectionData.value?.images) return null
  const currentIndex = collectionData.value.images.findIndex(
    (img) => img.id === imageData.value?.id
  )
  if (currentIndex === -1) return null
  const nextIndex = (currentIndex + 1) % collectionData.value.images.length
  return collectionData.value.images[nextIndex]
}

const getPreviousImage = () => {
  if (!hasCollection.value || !collectionData.value?.images) return null
  const currentIndex = collectionData.value.images.findIndex(
    (img) => img.id === imageData.value?.id
  )
  if (currentIndex === -1) return null
  const prevIndex =
    (currentIndex - 1 + collectionData.value.images.length) % collectionData.value.images.length
  return collectionData.value.images[prevIndex]
}

const switchToImage = (image, direction) => {
  if (
    !image ||
    image.id === imageData.value?.id ||
    isSwitchingImage.value ||
    isAnimatingMetadata.value
  )
    return

  if (originalFlipId.value === null && flipId.value !== null) {
    originalFlipId.value = flipId.value
  }

  isSwitchingImage.value = true
  flipId.value = null
  imageChanged()

  direction ||= getSlideDirection(image) || 1

  const timeline = createSlideTimeline(image, direction)
  if (timeline) {
    if (direction === 1) {
      rightTransitionTimeline.value = timeline
    } else {
      leftTransitionTimeline.value = timeline
    }
    timeline.play()
  }
}

const handleCollectionImageClick = (event, image) => {
  event.stopPropagation()
  switchToImage(image)
}

const handleImageClick = (event) => {
  event.stopPropagation()
  if (hasDragMovement.value) return
  if (hasCollection.value) {
    toggleCollection()
  }
}

const handleBackToGallery = () => {
  hideImage()
}

const handleToggleMetadata = () => {
  if (hasMetadata.value) {
    toggleMetadata()
  }
}

const handleImageError = () => {
  setStyles(fullscreenImageElement.value, { visibility: "hidden" })
}

const preloadSlideImages = () => {
  if (!hasCollection.value) return

  const nextImage = getNextImage()
  const prevImage = getPreviousImage()

  if (nextImage) {
    const nextThumbnail = getImageVersion(nextImage, "thumbnail")
    const img = new Image()
    img.src = nextThumbnail.path
  }

  if (prevImage) {
    const prevThumbnail = getImageVersion(prevImage, "thumbnail")
    const img = new Image()
    img.src = prevThumbnail.path
  }
}

const onImageUpdate = async (image) => {
  if (image) {
    if (updateRoute.value) setupRouting(image.id)
    if (image.collectionId) collectionData.value = await collectionsStore.fetch(image.collectionId)
    if (!isSwitchingImage.value) nextTick(showImage)
    nextTick(() => preloadSlideImages())
  } else {
    initialMetadataWidth.value = 0
  }
}

const updateImageConstraints = () => {
  const { height, width } = calculateOptimalImageSize({
    collectionVisible: collectionVisible.value,
    metadataVisible: metadataVisible.value
  })
  setStyles([fullscreenImageElement.value, fallbackImageElement.value], {
    height,
    maxHeight: maxImageHeight(collectionVisible.value),
    maxWidth: maxImageWidth(metadataVisible.value),
    width
  })
}

const updateMobileLayout = () => {
  if (isMobileLayout.value) setBaseMobileMetadataStyles(metadataVisible.value)
}

const onWindowWidthUpdate = () => {
  updateImageConstraints()
  updateMobileLayout()
}

const onWindowHeightUpdate = () => {
  updateImageConstraints()
  updateMobileLayout()
}

const onLayoutChange = (isMobile) => {
  if (!metadataVisible.value || isSettingInitialWidth.value) return
  metadataVisible.value = false
  setVisibility(imageMetadataElement.value, false)
  if (collectionVisible.value) setStyles(collectionElement.value, { x: 0 })
  setHiddenMetadataStyles(isMobile)
}

const handleDragStart = (event) => {
  const target = event.target
  const isButton = target.closest("button")
  const isImage = target.classList?.contains("image")
  const isInteractiveElement =
    isButton ||
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

  if (hasDragMovement.value) {
    event.preventDefault()
  }

  if (!hasDragMovement.value) return
  if (isSwitchingImage.value) return

  const dragProgress = deltaX / (windowWidth.value / 1.5)

  if (activeTimelineOnInterrupt.value) {
    const activeTimeline =
      activeTimelineOnInterrupt.value === "right"
        ? rightTransitionTimeline.value
        : leftTransitionTimeline.value

    if (activeTimeline) {
      let newProgress
      if (activeTimelineOnInterrupt.value === "right") {
        newProgress = Math.abs(initialProgress.value) + dragProgress
      } else {
        newProgress = Math.abs(initialProgress.value) - dragProgress
      }

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
      if (leftTransitionTimeline.value) {
        leftTransitionTimeline.value.progress(0)
      }
    } else if (clampedProgress < 0 && leftTransitionTimeline.value) {
      leftTransitionTimeline.value.progress(Math.abs(clampedProgress))
      if (rightTransitionTimeline.value) {
        rightTransitionTimeline.value.progress(0)
      }
    } else if (clampedProgress === 0) {
      if (leftTransitionTimeline.value) leftTransitionTimeline.value.progress(0)
      if (rightTransitionTimeline.value) rightTransitionTimeline.value.progress(0)
    }
  }
}

const handleDragEnd = (event) => {
  if (!isDragging.value) return

  if (hasDragMovement.value) {
    event.preventDefault()
  }

  if (isSwitchingImage.value) {
    isDragging.value = false
    setTimeout(() => (hasDragMovement.value = false), 0)
    initialProgress.value = 0
    dragStartPosition.value = 0
    activeTimelineOnInterrupt.value = null
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
  const targetTimeline = progress > 0 ? rightTransitionTimeline.value : leftTransitionTimeline.value

  if (Math.abs(progress) >= 0.5) {
    isSwitchingImage.value = true
    targetTimeline?.play()
  } else {
    isSwitchingImage.value = true
    targetTimeline?.reverse()
  }

  isDragging.value = false
  setTimeout(() => (hasDragMovement.value = false), 0)
  initialProgress.value = 0
  dragStartPosition.value = 0
  activeTimelineOnInterrupt.value = null
}

const handleWindowKeyDown = (event) => {
  if (isAnimating.value || isSwitchingImage.value || isDragging.value || !imageData.value) return

  switch (event.key) {
    case "ArrowDown":
    case "ArrowUp": {
      event.preventDefault()
      if (hasCollection.value) {
        toggleCollection()
      }
      break
    }
    case "ArrowLeft": {
      event.preventDefault()
      const prevImage = getPreviousImage()
      if (prevImage) switchToImage(prevImage, -1)
      break
    }
    case "ArrowRight": {
      event.preventDefault()
      const nextImage = getNextImage()
      if (nextImage) switchToImage(nextImage, 1)
      break
    }
    case "Enter":
    case "i":
    case "I":
      event.preventDefault()
      handleToggleMetadata()
      break
    case "Escape":
      event.preventDefault()
      handleBackToGallery()
      break
  }
}

watch(imageData, async (image) => onImageUpdate(image))
watch(windowWidth, onWindowWidthUpdate, { immediate: true })
watch(windowHeight, onWindowHeightUpdate, { immediate: true })
watch(isMobileLayout, onLayoutChange, { immediate: true })
watch(triggerHide, () => triggerHide.value && nextTick(hideImage))

onMounted(async () => {
  window.addEventListener("keydown", handleWindowKeyDown)
  gsap.registerPlugin(Flip)

  if (imageData.value) {
    if (imageData.value.collectionId && !collectionData.value) {
      collectionData.value = await collectionsStore.fetch(imageData.value.collectionId)
    }

    isAnimating.value = false
    nextTick(() => showImage(true))
  }
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleWindowKeyDown)
})
</script>

<template>
  <div
    v-if="imageData"
    ref="fullscreen-image-container"
    class="fullscreen-image-container"
    :class="{ dragging: isDragging }"
    @touchstart="handleDragStart"
    @touchmove="handleDragMove"
    @touchend="handleDragEnd"
    @mousedown="handleDragStart"
    @mousemove="handleDragMove"
    @mouseleave="handleDragEnd"
    @mouseup="handleDragEnd"
  >
    <div ref="left-controls" class="floating-controls top-left">
      <button class="floating-button" @click="handleBackToGallery">
        <Icon name="ArrowLeft" :size="18" />
        <span class="button-text">Gallery</span>
      </button>
    </div>
    <div v-if="hasMetadata" ref="right-controls" class="floating-controls top-right">
      <button
        class="floating-button"
        :class="{ active: metadataVisible }"
        @click="handleToggleMetadata"
      >
        <Icon name="Info" :size="18" />
        <span class="button-text">Info</span>
      </button>
    </div>

    <div ref="fullscreen-image" class="fullscreen-image" :data-flip-id="flipId">
      <img
        class="image"
        :src="regularImageVersion.path"
        @click="handleImageClick"
        @error="handleImageError"
      />
      <img class="fallback" :src="thumbnailImageVersion.path" />
      <img
        v-show="leftSlideImagePath"
        ref="left-slide-image"
        class="slide-image"
        :src="leftSlideImagePath"
      />
      <img
        v-show="rightSlideImagePath"
        ref="right-slide-image"
        class="slide-image"
        :src="rightSlideImagePath"
      />
      <ImageMetadata v-if="hasMetadata" ref="image-metadata" :image="imageData" />
    </div>
    <CollectionImages
      v-if="hasCollection"
      ref="collection-images"
      :collection="collectionData"
      :current-image-id="imageData?.id"
      @click="handleCollectionImageClick"
    />
  </div>
  <div v-if="SHOW_DEBUG_INFO" class="debug-info">
    <p>Metadata visible: {{ metadataVisible }}</p>
    <p>Collection visible: {{ collectionVisible }}</p>
    <p>Is switching images: {{ isSwitchingImage }}</p>
    <p>Temp slide left image path: {{ leftSlideImagePath }}</p>
    <p>Temp slide right image path: {{ rightSlideImagePath }}</p>
    <p>Is dragging: {{ isDragging }}</p>
    <p>Left timeline: {{ leftTransitionTimeline ? "exists" : "null" }}</p>
    <p>Right timeline: {{ rightTransitionTimeline ? "exists" : "null" }}</p>
    <p>Slide progress: {{ slideProgress.toFixed(3) }}</p>
    <p>Initial progress: {{ initialProgress.toFixed(3) }}</p>
  </div>
</template>

<style lang="scss">
.floating-controls {
  position: fixed;
  z-index: z(overlay) + 20;
  opacity: 0;

  &.top-left {
    top: var(--spacing-4);
    left: var(--spacing-4);
  }

  &.top-right {
    top: var(--spacing-4);
    right: var(--spacing-4);
  }
  background-color: var(--menu-background);
  backdrop-filter: blur(5px);
  border-radius: calc(var(--radius-lg) + var(--spacing-2));
}

.floating-button {
  border: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background-color: transparent;

  border: 1px solid var(--border);
  border-radius: calc(var(--radius-lg) + var(--spacing-2));
  cursor: pointer;
  color: inherit;
  @include text("base");
  font-weight: var(--font-normal);
  text-transform: uppercase;
}

.button-text {
  white-space: nowrap;
}

.fullscreen-image-container {
  @include fill-parent;
  @include flex-center;
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: z(overlay);
  user-select: none;

  &.dragging {
    cursor: grabbing;
  }

  .fullscreen-image {
    position: relative;
    display: none;
    opacity: 0;
    z-index: z(overlay);
    will-change: transform, opacity;

    > img {
      height: auto;
      width: auto;
      user-select: none;
      visibility: hidden;
      object-fit: contain;
      will-change: transform, opacity;
      border-radius: var(--radius-lg);

      &.fallback {
        position: absolute;
        top: 0;
        left: 0;
        z-index: -1;
      }

      &.slide-image {
        position: absolute;
        top: 0;
        left: 0;
        visibility: hidden;
        will-change: transform;
      }
    }
  }

  .image-metadata {
    position: absolute;
    width: max-content;
    height: 100%;
    right: 0;
    z-index: -1;
    visibility: hidden;
  }

  .collection-images {
    position: absolute;
    width: 100vw;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: -1;
    visibility: hidden;
  }
}
</style>
