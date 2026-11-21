<script setup lang="ts">
import { gsap } from "gsap"
import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { nextTick, onMounted, onUnmounted, useTemplateRef } from "vue"

const props = withDefaults(
  defineProps<{
    class?: string
    smoothness?: number
    smoothTouch?: number
  }>(),
  {
    class: "",
    smoothness: 2,
    smoothTouch: 0.1
  }
)

const smoothWrapper = useTemplateRef<HTMLDivElement>("smooth-wrapper")
const smoothContent = useTemplateRef<HTMLDivElement>("smooth-content")

let smoother: null | ScrollSmoother = null

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

const scrollTo = (position: gsap.DOMTarget | number, smooth = true) => {
  if (smoother) {
    smoother.scrollTo(position, smooth)
  }
}

defineExpose<{
  getSmoother: () => null | ScrollSmoother
  scrollTo: (position: gsap.DOMTarget | number, smooth?: boolean) => void
}>({
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
