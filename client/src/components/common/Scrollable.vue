<script setup>
import { gsap } from 'gsap'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { nextTick, onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = defineProps({
  class: {
    default: '',
    type: String
  },
  smoothness: {
    default: 2,
    type: Number
  },
  smoothTouch: {
    default: 0.1,
    type: Number
  }
})

const smoothWrapper = useTemplateRef('smooth-wrapper')
const smoothContent = useTemplateRef('smooth-content')

let smoother = null

const initSmoothScroll = () => {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

  smoother = ScrollSmoother.create({
    content: smoothContent.value,
    effects: true,
    smooth: props.smoothness,
    smoothTouch: props.smoothTouch,
    wrapper: smoothWrapper.value
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
  getSmoother: () => smoother,
  scrollTo
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
