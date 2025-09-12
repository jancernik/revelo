<script setup>
import CollectionImages from "#src/components/images/CollectionImages.vue"
import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { useElementSize } from "#src/composables/useElementSize"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useCollectionsStore } from "#src/stores/collections.js"
import { calculateImageAspectRatio } from "#src/utils/galleryHelpers"
import { cssVar } from "#src/utils/helpers"
import { getImageVersion } from "#src/utils/helpers"
import { gsap } from "gsap"
import { Flip } from "gsap/Flip"
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue"
import { useRouter } from "vue-router"

const FLIP_DURATION = 0.6 // Duration for FLIP animation when transitioning between thumbnail and fullscreen
const FLIP_EASE = "power2.inOut" // Easing function for FLIP animation transitions
const REGULAR_DURATION = 0.4 // Duration for fallback fade/scale animation when no thumbnail available
const REGULAR_EASE = "power3.inOut" // Easing function for fallback animations
const REGULAR_SCALE = 0.85 // Initial scale factor for fallback show/hide animations
const SLIDE_EASE = "power2.inOut" // Easing function for metadata/collection slide animations
const SLIDE_DURATION = 0.4 // Duration for metadata/collection slide animations
const SPACING = 20 // Spacing offset in pixels for slide animations
const SPACING_PX = `${SPACING}px` // CSS spacing value derived from SPACING

const {
  callOnReturn,
  callUpdatePositions,
  completeHide,
  flipId,
  imageData,
  isAnimating,
  setPopstateCallback,
  triggerHide,
  updateRoute
} = useFullscreenImage()
const router = useRouter()
const collectionsStore = useCollectionsStore()

const collectionData = ref(null)
const metadataVisible = ref(false)
const collectionVisible = ref(false)
const initialMetadataWidth = ref(0)
const isSettingInitialWidth = ref(false)

const fullscreenContainerElement = useTemplateRef("fullscreen-image-container")
const fullscreenElement = useTemplateRef("fullscreen-image")
const fullscreenImageElement = computed(() => fullscreenElement.value?.querySelector("img"))
const thumbnailElement = computed(() => document.querySelector(`[data-flip-id="${flipId.value}"]`))
const thumbnailImageElement = computed(() => thumbnailElement.value?.querySelector("img"))
const imageMetadataRef = useTemplateRef("image-metadata")
const imageMetadataElement = computed(() => imageMetadataRef.value?.$el)
const collectionRef = useTemplateRef("collection-images")
const collectionElement = computed(() => collectionRef.value?.$el)

const regularImageVersion = computed(() => getImageVersion(imageData.value, "regular"))
const imageAspectRatio = computed(() => calculateImageAspectRatio(imageData.value))

const { height: windowHeight, width: windowWidth } = useWindowSize()
const { height: imageHeight } = useElementSize(fullscreenElement)
const { height: collectionHeight } = useElementSize(collectionElement)

const isMobileLayout = computed(() => {
  if (windowWidth.value <= 576) return true
  const availableSpace = windowWidth.value - SPACING * 2 - initialMetadataWidth.value
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

const hasMetadata = computed(() =>
  [
    "camera",
    "lens",
    "aperture",
    "shutterSpeed",
    "iso",
    "focalLength",
    "focalLengthEquivalent",
    "date"
  ].some((k) => imageData?.value?.[k])
)
const hasCollection = computed(() => collectionData?.value?.images?.length > 0)

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

const getAvailableImageSpace = (metadataVisible, collectionVisible) => {
  let availableWidth = windowWidth.value - SPACING * 2
  let availableHeight = windowHeight.value - SPACING * 2

  if (metadataVisible && !isMobileLayout.value) {
    availableWidth -= initialMetadataWidth.value + SPACING
  }

  if (collectionVisible) {
    availableHeight -= collectionHeight.value + SPACING
  }

  return { height: availableHeight, width: availableWidth }
}

const calculateOptimalImageSize = (metadataVisible, collectionVisible) => {
  if (!imageAspectRatio.value) return { height: "auto", width: "auto" }

  const { height: maxHeight, width: maxWidth } = getAvailableImageSpace(
    metadataVisible,
    collectionVisible
  )
  const aspectRatio = imageAspectRatio.value

  let height, width

  if (maxWidth / aspectRatio <= maxHeight) {
    width = maxWidth
    height = maxWidth / aspectRatio
  } else {
    height = maxHeight
    width = maxHeight * aspectRatio
  }

  return { height: `${height}px`, width: `${width}px` }
}

const maxImageHeight = (collectionVisible) => {
  if (!collectionVisible) return `calc(100vh - calc(${SPACING_PX} * 2))`
  const availableVh = 100 - ((collectionHeight.value + SPACING) / windowHeight.value) * 100
  return `calc(${availableVh}vh - calc(${SPACING_PX} * 2))`
}

const maxImageWidth = (metadataVisible) => {
  if (!metadataVisible || isMobileLayout.value) return `calc(100vw - calc(${SPACING_PX} * 2))`
  const availableVw = 100 - ((initialMetadataWidth.value + SPACING) / windowWidth.value) * 100
  return `calc(${availableVw}vw - calc(${SPACING_PX} * 2))`
}

const setVisibility = (element, visible) => {
  if (!element) return
  gsap.set(element, { visibility: visible ? "visible" : "hidden" })
}

const setStyles = (element, styles) => {
  if (!element) return
  gsap.set(element, styles)
}

const createAnimationTimeline = (options = {}) => {
  return gsap.timeline({
    defaults: {
      duration: SLIDE_DURATION,
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
    spacePx += collectionHeight.value + SPACING
    metadataOffset -= (collectionHeight.value + SPACING) / 2
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
  if (initialMetadataWidth.value === 0) {
    isSettingInitialWidth.value = true
    initialMetadataWidth.value = imageMetadataElement.value.offsetWidth
    nextTick(() => (isSettingInitialWidth.value = false))
  }

  if (isMobile) {
    setBaseMobileMetadataStyles(false)
  } else {
    setStyles(imageMetadataElement.value, {
      height: "100%",
      right: 0,
      top: 0,
      width: "max-content",
      x: 0,
      y: 0
    })
  }

  setStyles(fullscreenElement.value, { x: 0 })
  const { height, width } = calculateOptimalImageSize(false, collectionVisible.value)
  setStyles(fullscreenImageElement.value, { height, width })
}

const onShowComplete = () => {
  isAnimating.value = false
}

const onHideComplete = () => {
  isAnimating.value = false
  metadataVisible.value = false
  collectionVisible.value = false
  hideFullscreenElements()
  completeHide()
}

const showWithFlipAnimation = () => {
  if (!thumbnailElement.value) {
    showWithRegularAnimation()
    return
  }

  const perform = () => {
    if (!thumbnailElement.value) return

    const borderRadius = getThumbnailBorderRadius()
    const scaleRatio = getScaleRatio()
    const scaledBorderRadius = borderRadius / scaleRatio

    fullscreenImageElement.value.style.borderRadius = `${scaledBorderRadius}px`
    fullscreenElement.value.style.borderRadius = `${scaledBorderRadius}px`

    const state = Flip.getState([thumbnailElement.value, fullscreenElement.value])

    thumbnailElement.value.style.visibility = "hidden"

    setStyles(fullscreenElement.value, { opacity: 1 })
    setStyles(fullscreenImageElement.value, { visibility: "visible" })

    Flip.from(state, {
      duration: FLIP_DURATION,
      ease: FLIP_EASE,
      onComplete: onShowComplete,
      scale: true
    })

    gsap.to([fullscreenImageElement.value, fullscreenElement.value], {
      borderRadius: cssVar("--radius-lg"),
      duration: FLIP_DURATION,
      ease: FLIP_EASE
    })
  }

  showFullscreenElements()
  setStyles(fullscreenElement.value, { opacity: 0 })
  setStyles(fullscreenImageElement.value, {
    maxHeight: maxImageHeight(false),
    maxWidth: maxImageWidth(false),
    visibility: "hidden"
  })

  if (fullscreenImageElement.value.complete) {
    perform()
  } else {
    fullscreenImageElement.value.onload = perform
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

  callOnReturn()
}

const showWithRegularAnimation = () => {
  showFullscreenElements()
  setStyles(fullscreenImageElement.value, {
    maxHeight: maxImageHeight(false),
    maxWidth: maxImageWidth(false),
    visibility: "visible"
  })

  gsap.fromTo(
    fullscreenElement.value,
    { opacity: 0, scale: REGULAR_SCALE },
    {
      duration: REGULAR_DURATION,
      ease: REGULAR_EASE,
      onComplete: onShowComplete,
      opacity: 1,
      scale: 1
    }
  )
}

const hideWithRegularAnimation = () => {
  gsap.to(fullscreenElement.value, {
    duration: REGULAR_DURATION,
    ease: REGULAR_EASE,
    onComplete: onHideComplete,
    opacity: 0,
    scale: REGULAR_SCALE
  })
}

const showImage = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  const { height, width } = calculateOptimalImageSize(
    metadataVisible.value,
    collectionVisible.value
  )
  setStyles(fullscreenImageElement.value, { height, width })

  if (flipId.value) {
    showWithFlipAnimation()
  } else {
    showWithRegularAnimation()
  }
}

const hideImage = () => {
  if (isAnimating.value) return
  isAnimating.value = true

  if (flipId.value) {
    hideWithFlipAnimation()
    history.pushState({}, "", "/")
  } else {
    hideWithRegularAnimation()
    router.push("/")
  }
}

const animateMetadata = (visible, callback) => {
  if (!hasMetadata.value || !imageMetadataElement.value) return

  metadataVisible.value = !!visible
  if (visible) {
    setHiddenMetadataStyles(isMobileLayout.value)
    setVisibility(imageMetadataElement.value, true)
  }
  const tl = createAnimationTimeline({
    onComplete: () => {
      if (!visible) setVisibility(imageMetadataElement.value, false)
      callback?.()
    }
  })

  nextTick(() => {
    if (isMobileLayout.value) {
      let metadataOffset = -imageMetadataElement.value.offsetHeight
      if (collectionVisible.value) metadataOffset -= (collectionHeight.value + SPACING) / 2
      tl.to(imageMetadataElement.value, { y: visible ? metadataOffset : 0 })
    } else {
      const metadataOffset = initialMetadataWidth.value + SPACING
      const centerOffset = metadataOffset / -2

      tl.to(imageMetadataElement.value, { x: visible ? metadataOffset : 0 })
      tl.to(fullscreenElement.value, { x: visible ? centerOffset : 0 }, "<")
      const { height, width } = calculateOptimalImageSize(visible, collectionVisible.value)
      tl.to(fullscreenImageElement.value, { height, width }, "<")
    }
  })
}

const animateCollection = (visible, callback) => {
  if (!hasCollection.value || !collectionElement.value) return

  collectionVisible.value = !!visible
  if (visible) setVisibility(collectionElement.value, true)

  const collectionOffset = -(collectionHeight.value + SPACING)
  const centerOffset = collectionOffset / 2

  const tl = createAnimationTimeline({
    onComplete: () => {
      if (!visible) setVisibility(collectionElement.value, false)
      callback?.()
    }
  })

  tl.to(collectionElement.value, { y: visible ? collectionOffset : 0 })
  tl.to(fullscreenElement.value, { y: visible ? centerOffset : 0 }, "<")
  const { height, width } = calculateOptimalImageSize(metadataVisible.value, visible)
  tl.to(fullscreenImageElement.value, { height, width }, "<")

  if (metadataVisible.value && isMobileLayout.value) {
    tl.add(setBaseMobileMetadataStyles(metadataVisible.value, true), "<")
  }
}

const showMetadata = (callback) => animateMetadata(true, callback)
const hideMetadata = (callback) => animateMetadata(false, callback)
const showCollection = (callback) => animateCollection(true, callback)
const hideCollection = (callback) => animateCollection(false, callback)

const toggleMetadata = () => (metadataVisible.value ? hideMetadata() : showMetadata())
const toggleCollection = () => (collectionVisible.value ? hideCollection() : showCollection())

const createPopstateCallback = (animationFn) => () => {
  animationFn()
  history.pushState({}, "", "/")
}

const setupRouting = (imageId) => {
  history.pushState({}, "", `/images/${imageId}`)
  const callback = flipId.value
    ? createPopstateCallback(hideWithFlipAnimation)
    : createPopstateCallback(hideWithRegularAnimation)
  setPopstateCallback(callback)
}

const onImageUpdate = async (image) => {
  if (image) {
    if (updateRoute.value) setupRouting(image.id)
    if (image.collectionId) collectionData.value = await collectionsStore.fetch(image.collectionId)
    nextTick(showImage)
  } else {
    initialMetadataWidth.value = 0
  }
}

const updateImageConstraints = () => {
  const { height, width } = calculateOptimalImageSize(
    metadataVisible.value,
    collectionVisible.value
  )
  setStyles(fullscreenImageElement.value, { height, width })
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

watch(imageData, async (image) => onImageUpdate(image))
watch(windowWidth, onWindowWidthUpdate, { immediate: true })
watch(windowHeight, onWindowHeightUpdate, { immediate: true })
watch(isMobileLayout, onLayoutChange, { immediate: true })
watch(triggerHide, () => triggerHide.value && nextTick(hideImage))

onMounted(() => gsap.registerPlugin(Flip))
</script>

<template>
  <div
    v-if="imageData"
    ref="fullscreen-image-container"
    class="fullscreen-image-container"
    @click="hideImage"
  >
    <div ref="fullscreen-image" class="fullscreen-image" :data-flip-id="flipId">
      <img :src="`/api/${regularImageVersion.path}`" />
      <ImageMetadata v-if="hasMetadata" ref="image-metadata" :image="imageData" />
    </div>
    <CollectionImages v-if="hasCollection" ref="collection-images" :collection="collectionData" />
    <div class="debug-controls">
      <button @click.stop="toggleMetadata">Toggle Metadata</button>
      <button @click.stop="toggleCollection">Toggle Collection</button>
    </div>
  </div>
</template>

<style lang="scss">
$spacing: v-bind(SPACING_PX);

.debug-controls {
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 10px;
  z-index: z(overlay);
}

.fullscreen-image-container {
  @include fill-parent;
  @include flex-center;
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: z(overlay);

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
