<script setup>
import { onMounted, onUnmounted, useTemplateRef, nextTick } from 'vue'
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
    default: 2
  },
  smoothTouch: {
    type: Number,
    default: 0.1
  }
})

const smoothWrapper = useTemplateRef('smooth-wrapper')
const smoothContent = useTemplateRef('smooth-content')

let smoother = null

const initSmoothScroll = () => {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

  smoother = ScrollSmoother.create({
    wrapper: smoothWrapper.value,
    content: smoothContent.value,
    smooth: props.smoothness,
    smoothTouch: props.smoothTouch,
    effects: true
  })
}
const cleanup = () => {
  if (smoother) {
    smoother.kill()
  }

  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

const scrollTo = (position, smooth = true) => {
  if (smoother) {
    smoother.scrollTo(position, smooth)
  }
}

defineExpose({
  scrollTo,
  getSmoother: () => smoother
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
  <div ref="smooth-wrapper" :class="['smooth-wrapper', props.class]">
    <div ref="smooth-content" class="smooth-content">
      <slot />
    </div>
  </div>
</template>

<style lang="scss">
.smooth-wrapper {
  @include fill-parent;
  position: relative;
}
</style>
