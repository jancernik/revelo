import { gsap } from "gsap"
import { computed, ref, toValue } from "vue"

import { useWindowSize } from "#src/composables/useWindowSize"
import { useImagesStore } from "#src/stores/images"
import {
  MAX_COLUMN_WIDTH,
  MAX_COLUMNS,
  MAX_WIDTH,
  MIN_COLUMNS,
  SPACING_BASE,
  SPACING_SMALL
} from "#src/utils/galleryConstants"
import { groupImages } from "#src/utils/galleryHelpers"
import { clamp } from "#src/utils/helpers"

export function useGalleryLayout(forcedColumns) {
  const imagesStore = useImagesStore()
  const { height: windowHeight, width: windowWidth } = useWindowSize()

  const imageGroups = ref([])

  const maxWindowWidth = computed(() => Math.min(windowWidth.value, MAX_WIDTH))
  const noImages = computed(() => imagesStore.visibleFilteredImages.length === 0)

  const columnCount = computed(() => {
    const columns = toValue(forcedColumns)
    if (columns && columns >= MIN_COLUMNS && columns <= MAX_COLUMNS) {
      return columns
    }
    const base = Math.ceil(
      (maxWindowWidth.value - SPACING_BASE) / (MAX_COLUMN_WIDTH + SPACING_BASE)
    )
    const clamped = clamp(base, MIN_COLUMNS, MAX_COLUMNS)
    if (clamped % 2 === 0 && clamped !== 2) return clamped < MAX_COLUMNS ? clamped + 1 : clamped - 1
    return clamped
  })

  const currentSpacing = computed(() => (columnCount.value === 2 ? SPACING_SMALL : SPACING_BASE))

  const availableWidth = computed(() => {
    return toValue(forcedColumns) ? windowWidth.value : maxWindowWidth.value
  })

  const columnWidth = computed(() => {
    const totalSpacing = currentSpacing.value * 2 + currentSpacing.value * (columnCount.value - 1)
    return (availableWidth.value - totalSpacing) / columnCount.value
  })

  const galleryWidth = computed(() => {
    return (
      currentSpacing.value * 2 +
      columnCount.value * columnWidth.value +
      currentSpacing.value * (columnCount.value - 1)
    )
  })

  const centerOffset = computed(() => {
    return Math.max(0, (windowWidth.value - galleryWidth.value) / 2)
  })

  const firstColumnMargin = computed(() => centerOffset.value + currentSpacing.value)

  const updateImageGroups = () => {
    const groups = groupImages(imagesStore.visibleFilteredImages, columnCount.value, {
      preserveOrder: imagesStore.orderBy !== null
    })

    if (imagesStore.orderBy === null) {
      imageGroups.value = groups.map((group) => gsap.utils.shuffle(group))
    } else {
      imageGroups.value = groups
    }
  }

  return {
    columnCount,
    columnWidth,
    currentSpacing,
    firstColumnMargin,
    galleryWidth,
    imageGroups,
    imagesStore,
    noImages,
    updateImageGroups,
    windowHeight,
    windowWidth
  }
}
