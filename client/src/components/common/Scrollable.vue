<script setup>
import { onMounted, onUnmounted, useTemplateRef, nextTick, ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

const props = defineProps({
  class: {
    type: String,
    default: ''
  },
  smoothness: {
    type: Number,
    default: 1
  },
  smoothTouch: {
    type: Number,
    default: 0.1
  },
  showScrollbar: {
    type: Boolean,
    default: true
  }
})

const smoothWrapper = useTemplateRef('smooth-wrapper')
const smoothContent = useTemplateRef('smooth-content')
const scrollbarTrack = useTemplateRef('scrollbar-track')
const scrollbarThumb = useTemplateRef('scrollbar-thumb')

let smoother = null

// Scrollbar state
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartScrollTop = ref(0)
const viewportHeight = ref(0)
const contentHeight = ref(0)
const scrollTop = ref(0)

// Computed properties for scrollbar
const scrollRatio = computed(() => {
  if (contentHeight.value <= viewportHeight.value) return 0
  return scrollTop.value / (contentHeight.value - viewportHeight.value)
})

const thumbHeight = computed(() => {
  if (contentHeight.value <= viewportHeight.value) return 0
  const ratio = viewportHeight.value / contentHeight.value
  const minHeight = 20 // Minimum thumb height
  return Math.max(minHeight, ratio * viewportHeight.value)
})

const thumbTop = computed(() => {
  const availableSpace = viewportHeight.value - thumbHeight.value
  return scrollRatio.value * availableSpace
})

const isScrollbarVisible = computed(() => {
  return props.showScrollbar && contentHeight.value > viewportHeight.value && thumbHeight.value > 0
})

const thumbStyle = computed(() => ({
  height: `${thumbHeight.value}px`,
  transform: `translateY(${thumbTop.value}px)`
}))

// Initialize smooth scroll
const initSmoothScroll = () => {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
  smoother = ScrollSmoother.create({
    wrapper: smoothWrapper.value,
    content: smoothContent.value,
    smooth: props.smoothness,
    smoothTouch: props.smoothTouch,
    effects: true,
  })

  smoother.effects("img", { speed: "auto" });

  // Initialize scrollbar after smoother is created
  if (props.showScrollbar) {
    initScrollbar()
  }
}

// Scrollbar functions
const updateDimensions = () => {
  if (!smoothWrapper.value || !smoothContent.value) return

  viewportHeight.value = smoothWrapper.value.clientHeight
  contentHeight.value = smoothContent.value.scrollHeight
}

const updateScrollPosition = () => {
  if (!smoother) return
  scrollTop.value = smoother.scrollTop()
}

const onScroll = () => {
  updateScrollPosition()
}

const onTrackClick = (event) => {
  if (event.target === scrollbarThumb.value) return

  const rect = scrollbarTrack.value.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const targetScrollRatio = clickY / viewportHeight.value
  const targetScrollTop = targetScrollRatio * (contentHeight.value - viewportHeight.value)

  if (smoother) {
    smoother.scrollTo(targetScrollTop, true)
  }
}

const onThumbMouseDown = (event) => {
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  dragStartY.value = event.clientY
  dragStartScrollTop.value = scrollTop.value

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = 'none'
}

const onMouseMove = (event) => {
  if (!isDragging.value) return

  const deltaY = event.clientY - dragStartY.value
  const scrollRatio = deltaY / (viewportHeight.value - thumbHeight.value)
  const deltaScroll = scrollRatio * (contentHeight.value - viewportHeight.value)
  const newScrollTop = Math.max(0, Math.min(
    contentHeight.value - viewportHeight.value,
    dragStartScrollTop.value + deltaScroll
  ))

  if (smoother) {
    smoother.scrollTo(newScrollTop, true)
  }
}

const onMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.body.style.userSelect = ''
}

// Observers
let resizeObserver = null
let contentResizeObserver = null
let updateInterval = null

const setupObservers = () => {
  if (!smoothWrapper.value || !smoothContent.value) return

  // Observe wrapper size changes
  resizeObserver = new ResizeObserver(() => {
    updateDimensions()
  })
  resizeObserver.observe(smoothWrapper.value)

  // Observe content size changes
  contentResizeObserver = new ResizeObserver(() => {
    updateDimensions()
  })
  contentResizeObserver.observe(smoothContent.value)
}

const setupScrollListener = () => {
  if (!smoother) return

  const wrapper = smoothWrapper.value
  if (wrapper) {
    wrapper.addEventListener('scroll', onScroll, { passive: true })
  }

  window.addEventListener('scroll', onScroll, { passive: true })
}

const initScrollbar = () => {
  nextTick(() => {
    if (smoothWrapper.value && smoothContent.value) {
      setupObservers()
      setupScrollListener()
      updateDimensions()
      updateScrollPosition()

      // Start update loop
      const update = () => {
        updateScrollPosition()
        updateInterval = requestAnimationFrame(update)
      }
      update()
    }
  })
}

const cleanup = () => {
  if (smoother) {
    smoother.kill()
    smoother = null
  }
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())

  // Cleanup scrollbar
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (contentResizeObserver) {
    contentResizeObserver.disconnect()
    contentResizeObserver = null
  }
  if (updateInterval) {
    cancelAnimationFrame(updateInterval)
    updateInterval = null
  }

  const wrapper = smoothWrapper.value
  if (wrapper) {
    wrapper.removeEventListener('scroll', onScroll)
  }
  window.removeEventListener('scroll', onScroll)

  // Cleanup drag listeners if still active
  if (isDragging.value) {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.userSelect = ''
  }
}

const scrollTo = (position, smooth = true) => {
  if (smoother) {
    smoother.scrollTo(position, smooth)
  }
}

defineExpose({
  scrollTo,
  getSmoother: () => smoother,
})

onMounted(() => {
  nextTick(() => {
    initSmoothScroll()
  })
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div>
    <div ref="smooth-wrapper" :class="['smooth-wrapper', props.class]">
      <div ref="smooth-content" class="smooth-content">
        <slot />
      </div>
    </div>

    <!-- Custom Scrollbar -->
    <div
      v-if="isScrollbarVisible"
      ref="scrollbar-track"
      class="custom-scrollbar-track"
      @mousedown="onTrackClick"
    >
      <div
        ref="scrollbar-thumb"
        class="custom-scrollbar-thumb"
        :style="thumbStyle"
        @mousedown="onThumbMouseDown"
      />
    </div>
  </div>
</template>

<style lang="scss">
.smooth-wrapper {
  @include fill-parent;
  position: relative;

  // Hide default scrollbar
}

.custom-scrollbar-track {
  position: fixed;
  right: 5px;
  top: 5px;
  bottom: 5px;
  width: 12px;
  background: transparent;
  z-index: 1000;
  cursor: pointer;

  &:hover .custom-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.6);
    width: 12px;
  }
}

.custom-scrollbar-thumb {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s ease;

  &:active {
    cursor: grabbing;
    background-color: rgba(0, 0, 0, 0.7);
    width: 12px;
  }
}
</style>
