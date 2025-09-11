<script setup>
import CollectionImages from "#src/components/images/CollectionImages.vue"
import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { useElementSize } from "#src/composables/useElementSize"
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useCollectionsStore } from "#src/stores/collections.js"
import { cssVar } from "#src/utils/helpers"
import { getImageVersion } from "#src/utils/helpers"
import { gsap } from "gsap"
import { Flip } from "gsap/Flip"
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue"
import { useRouter } from "vue-router"

const FLIP_DURATION = 0.6 // Duration for FLIP animation when zooming in/out
const FLIP_EASE = "power2.inOut" // Easing for FLIP animation when zooming in/out
const REGULAR_DURATION = 0.4 // Duration for regular fade/scale animation
const REGULAR_EASE = "power3.inOut" // Easing for regular fade/scale animation
const REGULAR_SCALE = 0.85 // Scale for regular animation when hiding
const SLIDE_EASE = "power2.inOut"
const SLIDE_DURATION = 0.4
const SLIDE_OFFSET = 20
const SPACING = `${SLIDE_OFFSET}px`

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

const fullscreenContainerElement = useTemplateRef("fullscreen-image-container")
const fullscreenElement = useTemplateRef("fullscreen-image")
const fullscreenImageElement = computed(() => fullscreenElement.value?.querySelector("img"))
const thumbnailElement = computed(() => document.querySelector(`[data-flip-id="${flipId.value}"]`))
const thumbnailImageElement = computed(() => thumbnailElement.value?.querySelector("img"))
const imageMetadataElement = useTemplateRef("image-metadata")
const collectionElement = useTemplateRef("collection-images")

const regularImageVersion = computed(() => getImageVersion(imageData.value, "regular"))

const { height: windowHeight, width: windowWidth } = useWindowSize()
// const { height: imageHeight, width: imageWidth } = useElementSize(fullscreenElement)
const { width: metadataWidth } = useElementSize(imageMetadataElement)
const { height: collectionHeight } = useElementSize(collectionElement)

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

const showFullscreenElements = () => {
  fullscreenElement.value.style.display = "flex"
  fullscreenContainerElement.value.style.display = "flex"
}

const hideFullscreenElements = () => {
  fullscreenElement.value.style.display = "none"
  fullscreenContainerElement.value.style.display = "none"
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

    gsap.set(fullscreenElement.value, { opacity: 1 })
    gsap.set(fullscreenImageElement.value, { visibility: "visible" })

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
  gsap.set(fullscreenElement.value, { opacity: 0 })
  gsap.set(fullscreenImageElement.value, { visibility: "hidden" })

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
  gsap.set(fullscreenImageElement.value, { visibility: "visible" })

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

const maxImageHeight = (collectionVisible) => {
  if (!collectionVisible) return `calc(100vh - calc(${SPACING} * 2))`
  const availableVh = 100 - ((collectionHeight.value + SLIDE_OFFSET) / windowHeight.value) * 100
  return `calc(${availableVh}vh - calc(${SPACING} * 2))`
}

const maxImageWidth = (metadataVisible) => {
  if (!metadataVisible) return `calc(100vw - calc(${SPACING} * 2))`
  const availableVw = 100 - ((metadataWidth.value + SLIDE_OFFSET) / windowWidth.value) * 100
  return `calc(${availableVw}vw - calc(${SPACING} * 2))`
}

const animateMetadata = (visible, callback) => {
  if (!hasMetadata.value) return
  metadataVisible.value = !!visible

  if (visible) {
    gsap.set(imageMetadataElement?.value?.$el, { visibility: "visible" })
  }

  const metadataOffset = metadataWidth.value + 20
  const centerOffset = metadataOffset / -2

  const tl = gsap.timeline({
    defaults: {
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE
    },
    onComplete: () => {
      if (!visible) {
        gsap.set(imageMetadataElement?.value?.$el, { visibility: "hidden" })
      }
      callback?.()
    }
  })

  tl.to(imageMetadataElement?.value?.$el, { x: visible ? metadataOffset : 0 })
  tl.to(fullscreenElement.value, { x: visible ? centerOffset : 0 }, "<")
  tl.to(fullscreenImageElement.value, { maxWidth: maxImageWidth(visible) }, "<")
}

const animateCollection = (visible, callback) => {
  if (!hasCollection.value) return
  collectionVisible.value = !!visible

  if (visible) {
    gsap.set(collectionElement?.value?.$el, { visibility: "visible" })
  }

  const collectionOffset = collectionHeight.value + 20
  const centerOffset = collectionOffset / -2

  const tl = gsap.timeline({
    defaults: {
      duration: SLIDE_DURATION,
      ease: SLIDE_EASE
    },
    onComplete: () => {
      if (!visible) {
        gsap.set(collectionElement?.value?.$el, { visibility: "hidden" })
      }
      callback?.()
    }
  })

  tl.to(collectionElement?.value?.$el, { y: visible ? collectionOffset : 0 })
  tl.to(fullscreenElement.value, { y: visible ? centerOffset : 0 }, "<")
  tl.to(fullscreenImageElement.value, { maxHeight: maxImageHeight(visible) }, "<")
}

const showMetadata = (callback) => animateMetadata(true, callback)
const hideMetadata = (callback) => animateMetadata(false, callback)
const showCollection = (callback) => animateCollection(true, callback)
const hideCollection = (callback) => animateCollection(false, callback)

const toggleMetadata = () => {
  metadataVisible.value ? hideMetadata() : showMetadata()
}

const toggleCollection = () => {
  collectionVisible.value ? hideCollection() : showCollection()
}

const createPopstateCallback = (animationFn) => () => {
  animationFn()
  history.pushState({}, "", "/")
}

watch(imageData, async () => {
  if (imageData.value) {
    if (updateRoute.value) {
      history.pushState({}, "", `/images/${imageData.value.id}`)

      const callback = flipId.value
        ? createPopstateCallback(hideWithFlipAnimation)
        : createPopstateCallback(hideWithRegularAnimation)

      setPopstateCallback(callback)
    }

    if (imageData.value.collectionId) {
      collectionData.value = await collectionsStore.fetch(imageData.value.collectionId)
    }

    nextTick(showImage)
  }
})

watch(triggerHide, () => {
  if (triggerHide.value) {
    nextTick(hideImage)
  }
})

watch(windowWidth, () => {
  if (metadataVisible.value) {
    gsap.set(fullscreenImageElement.value, { maxWidth: maxImageWidth(true) })
  }
})

watch(windowHeight, () => {
  if (collectionVisible.value) {
    gsap.set(fullscreenImageElement.value, { maxHeight: maxImageHeight(true) })
  }
})

onMounted(() => {
  gsap.registerPlugin(Flip)
})
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
      <CollectionImages v-if="hasCollection" ref="collection-images" :collection="collectionData" />
    </div>
    <div class="test">
      <button @click.stop="toggleMetadata">Toggle Metadata</button>
      <button @click.stop="toggleCollection">Toggle Collection</button>
    </div>
  </div>
</template>

<style lang="scss">
$spacing: v-bind(SPACING);

.test {
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
    will-change: transform, opacity;

    > img {
      max-width: calc(100vw - calc($spacing * 2));
      max-height: calc(100vh - calc($spacing * 2));
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
    width: 100%;
    bottom: 0;
    left: 0;
    z-index: -1;
    visibility: hidden;
  }
}
</style>
