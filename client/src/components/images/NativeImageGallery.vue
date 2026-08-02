<script setup>
import { gsap } from "gsap"
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from "vue"

import EmptyGalleryState from "#src/components/images/EmptyGalleryState.vue"
import ImageCard from "#src/components/images/ImageCard.vue"
import Loading from "#src/components/Loading.vue"
import { useDevice } from "#src/composables/useDevice"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useGalleryLayout } from "#src/composables/useGalleryLayout"
import { useMenu } from "#src/composables/useMenu"
import { transitionDuration, VIRTUAL_BUFFER, ZOOM_DURATION } from "#src/utils/galleryConstants"
import { elementCenter, sortStatesByDistance } from "#src/utils/galleryHelpers"
import { clamp } from "#src/utils/helpers"

const ZOOM_EASE = "sine.inOut" // Matches easeInOutSine used by the rAF renderer
const ZOOM_HIDDEN_SCALE = 0.8 // Scale surrounding images shrink to while zoomed into one image
const SCROLL_IDLE_DELAY = 120 // Milliseconds of no scroll events before the gallery counts as still

const props = defineProps({
  columns: {
    default: null,
    type: Number
  },
  menuVisible: {
    default: true,
    type: Boolean
  }
})

const { imageData: fullscreenImageData, show: showFullscreenImage } = useFullscreenImage()
const { hide: hideMenu, show: showMenu } = useMenu()
const { isMobile } = useDevice()
const {
  columnCount,
  columnWidth,
  currentSpacing,
  firstColumnMargin,
  imageGroups,
  imagesStore,
  noImages,
  updateImageGroups
} = useGalleryLayout(() => props.columns)

const scroller = useTemplateRef("scroller")

const cardCount = ref(0)
const isFirstLoad = ref(true)
const isScrolling = ref(false)
const isScrollLocked = ref(false)
const imageCountForInitialLoad = ref(0)
const loadedImageIds = ref(new Set())
const loadedTinyImageIds = ref(new Set())
const visibleImageIds = ref(new Set())

let cardObserver = null
let imageCardData = []
let lockedScrollTop = 0
let scrollIdleTimer = null
let zoomReleaseTimer = null
let settleCallbacks = []
let zoomReferencePoint = null
let zoomTargetImageId = null
let zoomTween = null

const zoomTotalDuration = computed(() => transitionDuration(isMobile.value))

const initialLoadProgress = computed(() => {
  if (imageCountForInitialLoad.value === 0) return 0

  const totalNeeded = cardCount.value + imageCountForInitialLoad.value
  const totalLoaded = loadedTinyImageIds.value.size + loadedImageIds.value.size

  if (totalLoaded >= totalNeeded) return 1
  return clamp(totalLoaded / totalNeeded, 0, 1)
})

const viewportCenter = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

const visibleCards = () => imageCardData.filter((card) => card.visible)

const cardElements = (cards) => cards.map((card) => card.element)

const lockScroll = () => {
  if (isScrollLocked.value || !scroller.value) return
  clearTimeout(zoomReleaseTimer)
  lockedScrollTop = scroller.value.scrollTop
  isScrollLocked.value = true
  scroller.value.style.overflowY = "hidden"
  scroller.value.style.touchAction = "none"
}

const unlockScroll = () => {
  if (!isScrollLocked.value) return
  isScrollLocked.value = false
  if (!scroller.value) return
  scroller.value.style.overflowY = ""
  scroller.value.style.touchAction = ""
  scroller.value.scrollTop = lockedScrollTop
}

const flushSettleCallbacks = () => {
  const callbacks = settleCallbacks
  settleCallbacks = []
  for (const callback of callbacks) callback()
}

const handleScroll = () => {
  isScrolling.value = true
  clearTimeout(scrollIdleTimer)
  scrollIdleTimer = setTimeout(() => {
    isScrolling.value = false
    flushSettleCallbacks()
  }, SCROLL_IDLE_DELAY)
}

const buildCardRegistry = () => {
  imageCardData = []
  if (!scroller.value) return

  scroller.value.querySelectorAll(".gallery-column").forEach((columnElement, columnIndex) => {
    columnElement.querySelectorAll(".image-card").forEach((cardElement) => {
      const image = cardElement.querySelector("img")
      if (!image?.dataset.id) return
      imageCardData.push({
        columnIndex,
        element: cardElement,
        imageId: image.dataset.id,
        visible: false
      })
    })
  })

  cardCount.value = imageCardData.length
}

const handleIntersect = (entries) => {
  for (const entry of entries) {
    const card = imageCardData.find(({ element }) => element === entry.target)
    if (!card) continue

    card.visible = entry.isIntersecting
    if (entry.isIntersecting) visibleImageIds.value.add(card.imageId)
  }

  if (!imageCountForInitialLoad.value) {
    imageCountForInitialLoad.value = visibleImageIds.value.size
  }
}

const observeCards = () => {
  cardObserver?.disconnect()
  if (!scroller.value || !imageCardData.length) return

  cardObserver = new IntersectionObserver(handleIntersect, {
    root: scroller.value,
    rootMargin: `${VIRTUAL_BUFFER}px 0px`
  })

  for (const card of imageCardData) cardObserver.observe(card.element)
}

const rebuildLayout = async () => {
  await nextTick()
  await nextTick()
  buildCardRegistry()
  if (isFirstLoad.value) {
    gsap.set(cardElements(imageCardData), { opacity: 0, scale: ZOOM_HIDDEN_SCALE })
  }
  observeCards()
}

const runZoomTween = (cards, options = {}) => {
  const { duration, onComplete, reveal } = options
  zoomTween?.kill()

  if (reveal) {
    const staggered = new Set(cardElements(cards))
    const rest = imageCardData.filter(
      ({ element, imageId }) => !staggered.has(element) && imageId !== zoomTargetImageId
    )
    if (rest.length) gsap.set(cardElements(rest), { opacity: 1, scale: 1 })
  }

  if (!cards.length) {
    onComplete?.()
    return
  }

  const total = duration ?? zoomTotalDuration.value
  zoomTween = gsap.to(cardElements(cards), {
    duration: ZOOM_DURATION,
    ease: ZOOM_EASE,
    onComplete,
    opacity: reveal ? 1 : 0,
    scale: reveal ? 1 : ZOOM_HIDDEN_SCALE,
    stagger: cards.length > 1 ? total / (cards.length - 1) : 0
  })
}

const startZoomTransition = (imageId, referenceElement) => {
  hideMenu(true)
  zoomTargetImageId = imageId
  zoomReferencePoint = referenceElement ? elementCenter(referenceElement) : viewportCenter()

  const cards = visibleCards().filter((card) => card.imageId !== imageId)
  runZoomTween(sortStatesByDistance(cards, zoomReferencePoint, true))
}

const releaseZoomTarget = () => {
  clearTimeout(zoomReleaseTimer)
  zoomReleaseTimer = null
  zoomTargetImageId = null
  unlockScroll()
}

const scheduleZoomRelease = (flipDuration) => {
  clearTimeout(zoomReleaseTimer)
  const settledFor = Math.max(zoomTotalDuration.value + ZOOM_DURATION, flipDuration ?? 0)
  zoomReleaseTimer = setTimeout(releaseZoomTarget, settledFor * 1000)
}

const startZoomReturn = (options = {}) => {
  const { duration, flipDuration, showAllImages = false, withTarget = false } = options
  props.menuVisible && setTimeout(() => showMenu(true), 200)

  const cards = imageCardData.filter(
    (card) =>
      (card.visible || (showAllImages && card.imageId === zoomTargetImageId)) &&
      (showAllImages || card.imageId !== zoomTargetImageId)
  )

  const referencePoint = withTarget && zoomReferencePoint ? zoomReferencePoint : viewportCenter()
  const sorted = sortStatesByDistance(cards, referencePoint, false)
  zoomReferencePoint = null

  runZoomTween(sorted, { duration, reveal: true })
  scheduleZoomRelease(flipDuration)
}

const isCardOnScreen = (imageId) => {
  const card = imageCardData.find((entry) => entry.imageId === imageId)
  if (!card) return false

  const rect = card.element.getBoundingClientRect()
  return rect.bottom >= -VIRTUAL_BUFFER && rect.top <= window.innerHeight + VIRTUAL_BUFFER
}

const handleFullscreenReturn = (withTarget, isDifferentImage, flipDuration) => {
  if (!zoomTargetImageId) {
    unlockScroll()
    return
  }

  if (isDifferentImage) {
    gsap.set(cardElements(visibleCards()), { opacity: 0, scale: ZOOM_HIDDEN_SCALE })
  }

  startZoomReturn({ flipDuration, showAllImages: !!isDifferentImage, withTarget })
}

const handleImageClick = (event, image, flipId) => {
  if (zoomTargetImageId) return

  lockScroll()
  startZoomTransition(image.id, event.currentTarget)

  showFullscreenImage(image, {
    flipId,
    isThumbnailVisible: () => isCardOnScreen(image.id),
    onReturn: handleFullscreenReturn,
    queryParams: window.location.search,
    updatePositions: () => {}
  })
}

const handleImageLoad = (imageId) => {
  loadedImageIds.value.add(imageId)
}

const handleTinyImageLoad = (imageId) => {
  loadedTinyImageIds.value.add(imageId)
}

const onFirstLoadComplete = () => {
  isFirstLoad.value = false
  startZoomReturn({ duration: zoomTotalDuration.value / 2, withTarget: false })
  props.menuVisible && showMenu(true)
}

watch(
  () => imagesStore.visibleFilteredImages,
  async (images) => {
    if (!images.length) return

    updateImageGroups()

    const currentImageIds = new Set(images.map((image) => image.id))
    loadedImageIds.value = new Set(
      [...loadedImageIds.value].filter((id) => currentImageIds.has(id))
    )
    loadedTinyImageIds.value = new Set(
      [...loadedTinyImageIds.value].filter((id) => currentImageIds.has(id))
    )
    visibleImageIds.value.clear()
    imageCountForInitialLoad.value = 0

    await rebuildLayout()
  },
  { deep: true, immediate: true }
)

watch(columnCount, async (newCount, oldCount) => {
  if (newCount === oldCount) return
  updateImageGroups()
  await rebuildLayout()
})

watch(initialLoadProgress, (progress) => {
  if (progress === 1 && !isFirstLoad.value && !fullscreenImageData.value) {
    gsap.set(cardElements(visibleCards()), { opacity: 0, scale: ZOOM_HIDDEN_SCALE })
    startZoomReturn({ duration: zoomTotalDuration.value / 2, withTarget: false })
  }
})

onUnmounted(() => {
  cardObserver?.disconnect()
  zoomTween?.kill()
  flushSettleCallbacks()
  clearTimeout(scrollIdleTimer)
  clearTimeout(zoomReleaseTimer)
})

defineExpose({
  isAnimating: () => isScrolling.value,
  isAutoScrollActive: () => false,
  isScrollPaused: () => isScrollLocked.value,
  onSettle: (callback) => {
    if (isScrolling.value && !isScrollLocked.value) settleCallbacks.push(callback)
    else callback()
  },
  pauseScrolling: lockScroll,
  resumeScrolling: unlockScroll,
  startAutoScroll: () => {},
  stopAutoScroll: () => {}
})
</script>

<template>
  <div
    v-if="!noImages"
    ref="scroller"
    class="image-gallery native-gallery scrollable"
    tabindex="0"
    :style="{ paddingBlock: `${currentSpacing}px` }"
    @scroll.passive="handleScroll"
  >
    <div
      v-for="(group, index) in imageGroups"
      :key="index"
      class="gallery-column"
      :style="{
        gap: `${currentSpacing}px`,
        marginLeft: `${index === 0 ? firstColumnMargin : currentSpacing}px`,
        width: columnWidth + 'px'
      }"
    >
      <ImageCard
        v-for="image in group"
        :key="image.id"
        :identifier="image.id"
        :image="image"
        :should-load="visibleImageIds.has(image.id)"
        :native-layout="true"
        @load="handleImageLoad"
        @tiny-load="handleTinyImageLoad"
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
</template>

<style lang="scss">
.image-gallery.native-gallery {
  @include hide-scrollbar;
  align-items: flex-start;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;

  .gallery-column {
    height: auto;
    overflow: visible;
  }
}
</style>
