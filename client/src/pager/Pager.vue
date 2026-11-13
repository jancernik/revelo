<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue"

import type { PagerConfig } from "./config"
import type { Renderer, SlideSource } from "./render/types"
import type { Axis, DeepPartial, Direction, Neighbor, PagerFrame, Phase } from "./types"

import { PagerEngine } from "./engine"
import { GlassRenderer } from "./render/glass/GlassRenderer"

const props = withDefaults(
  defineProps<{
    /** Takes keyboard focus on mount, so arrow keys work at once. */
    autofocus?: boolean
    /** Axes a swipe moves along; the first is the main one. */
    axes?: Axis[]
    config?: DeepPartial<PagerConfig>
    /** Text for assistive technology describing an item. "Item 3 of 12" by default. */
    describe?: (index: number) => string
    index?: number
    /** Name of the region for assistive technology. */
    label?: string
    /** Where a step leads. Adjacent indices by default. */
    neighbor?: Neighbor
    /** Builds the renderer for the canvas. The glass transition by default. */
    renderer?: (canvas: HTMLCanvasElement) => Renderer
    slides: SlideSource
  }>(),
  {
    autofocus: false,
    axes: () => ["y"],
    config: undefined,
    describe: undefined,
    index: 0,
    label: "Pager",
    neighbor: undefined,
    renderer: (canvas: HTMLCanvasElement) => new GlassRenderer(canvas)
  }
)

const emit = defineEmits<{
  phase: [phase: Phase]
  "update:index": [index: number]
}>()

const root = useTemplateRef<HTMLDivElement>("root")
const canvas = useTemplateRef<HTMLCanvasElement>("canvas")
const phase = shallowRef<Phase>("idle")
const currentIndex = shallowRef(props.index)
let active: null | { engine: PagerEngine; renderer: Renderer } = null

const description = computed(() => {
  if (currentIndex.value < 0) return "No items"
  return props.describe
    ? props.describe(currentIndex.value)
    : `Item ${currentIndex.value + 1} of ${props.slides.count}`
})

const dispose = () => {
  active?.engine.dispose()
  active?.renderer.dispose()
  active = null
}

watch(canvas, (element) => {
  dispose()
  if (!element || !root.value) return
  const renderer = props.renderer(element)
  const engine = new PagerEngine(element, {
    axes: props.axes,
    config: props.config,
    index: props.index,
    keys: root.value,
    neighbor: props.neighbor,
    onIndex: (index) => {
      currentIndex.value = index
      emit("update:index", index)
    },
    onPhase: (value) => {
      phase.value = value
      emit("phase", value)
    },
    renderer,
    slides: props.slides
  })
  active = { engine, renderer }
})

watch(
  () => props.index,
  (index) => {
    if (active && index !== active.engine.index) active.engine.goTo(index)
  }
)
watch(
  () => [props.slides, props.slides.count] as const,
  ([slides]) => active?.engine.setSlides(slides)
)
watch(
  () => props.axes,
  (axes) => active?.engine.setAxes(axes)
)
watch(
  () => props.neighbor,
  (neighbor) => active?.engine.setNeighbor(neighbor)
)
watch(
  () => props.config,
  (config) => active?.engine.setConfig(config),
  { deep: true }
)

onMounted(() => {
  if (props.autofocus) root.value?.focus({ preventScroll: true })
})

onBeforeUnmount(dispose)

defineExpose({
  /** The last frame drawn. */
  frame: (): null | PagerFrame => active?.engine.frame ?? null,
  goTo: (index: number) => active?.engine.goTo(index),
  /** Draws a frame when the next one is due. Call after content changes. */
  redraw: () => active?.engine.redraw(),
  step: (axis: Axis, direction: Direction) => active?.engine.step(axis, direction)
})
</script>

<template>
  <div
    ref="root"
    class="pager"
    :class="{ 'is-dragging': phase === 'dragging' }"
    role="region"
    aria-roledescription="carousel"
    :aria-label="label"
    tabindex="0"
  >
    <canvas ref="canvas" class="pager-canvas" role="img" :aria-label="description" />
    <div class="pager-live" aria-live="polite" aria-atomic="true">{{ description }}</div>
    <slot />
  </div>
</template>

<style>
.pager {
  position: relative;
  overflow: hidden;
}

.pager:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

.pager-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.pager.is-dragging .pager-canvas {
  cursor: grabbing;
}

/* Read by screen readers, never seen. */
.pager-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
