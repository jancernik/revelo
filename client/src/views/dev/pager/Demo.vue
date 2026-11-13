<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue"

import {
  type Axis,
  type DeepPartial,
  GlassRenderer,
  type LayoutMode,
  type Neighbor,
  Pager,
  type PagerConfig,
  type Phase
} from "#src/pager"

import { makeSlides } from "./slides"

const COUNT = 12
/** Items a sideways step skips, standing in for a jump between collections. */
const SIDEWAYS_STEP = 3

type Axes = "both" | "x" | "y"
type Follow = PagerConfig["follow"]["mode"]

const slides = makeSlides(COUNT)
const pager = useTemplateRef("pager")
const index = ref(0)
const phase = ref<Phase>("idle")
const axes = ref<Axes>("y")
const layout = ref<LayoutMode>("framed")
const follow = ref<Follow>("catch")
const haptics = ref(true)
let renderer: GlassRenderer | null = null

const axisList = computed<Axis[]>(() => (axes.value === "both" ? ["y", "x"] : [axes.value]))
const config = computed<DeepPartial<PagerConfig>>(() => ({
  follow: { mode: follow.value },
  haptics: haptics.value
}))

const neighbor: Neighbor = (current, axis, direction) => {
  const next = current + direction * (axis === "x" ? SIDEWAYS_STEP : 1)
  return next >= 0 && next < COUNT ? next : null
}

const createRenderer = (canvas: HTMLCanvasElement) => {
  renderer = new GlassRenderer(canvas, {
    layout: { insets: { bottom: 112, left: 16, right: 16, top: 72 }, mode: layout.value }
  })
  return renderer
}

watch(layout, (mode) => {
  renderer?.setConfig({ layout: { mode } })
  pager.value?.redraw()
})

// Console access to the pager's state while testing.
if (import.meta.env.DEV) {
  Object.assign(window, {
    pagerDemo: {
      frame: () => pager.value?.frame() ?? null,
      get index() {
        return index.value
      }
    }
  })
}

const AXES: { label: string; value: Axes }[] = [
  { label: "Vertical", value: "y" },
  { label: "Horizontal", value: "x" },
  { label: "Both", value: "both" }
]
const LAYOUTS: { label: string; value: LayoutMode }[] = [
  { label: "Framed", value: "framed" },
  { label: "Morph", value: "morph" }
]
const FOLLOWS: { label: string; value: Follow }[] = [
  { label: "Catch", value: "catch" },
  { label: "Offset", value: "offset" }
]
</script>

<template>
  <Pager
    ref="pager"
    v-model:index="index"
    class="pager-demo"
    label="Pager demo"
    autofocus
    :slides="slides"
    :axes="axisList"
    :config="config"
    :neighbor="neighbor"
    :renderer="createRenderer"
    @phase="phase = $event"
  >
    <header class="pager-demo-top">
      <span>Pager</span>
      <span class="pager-demo-mono">{{ index + 1 }} / {{ COUNT }} · {{ phase }}</span>
    </header>
    <footer class="pager-demo-bottom">
      <div class="pager-demo-row" role="group" aria-label="Swipe axes">
        <button
          v-for="option in AXES"
          :key="option.value"
          type="button"
          :class="{ 'is-selected': axes === option.value }"
          :aria-pressed="axes === option.value"
          @click="axes = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="pager-demo-row" role="group" aria-label="Options">
        <button
          v-for="option in LAYOUTS"
          :key="option.value"
          type="button"
          :class="{ 'is-selected': layout === option.value }"
          :aria-pressed="layout === option.value"
          @click="layout = option.value"
        >
          {{ option.label }}
        </button>
        <button
          v-for="option in FOLLOWS"
          :key="option.value"
          type="button"
          :class="{ 'is-selected': follow === option.value }"
          :aria-pressed="follow === option.value"
          @click="follow = option.value"
        >
          {{ option.label }}
        </button>
        <button
          type="button"
          :class="{ 'is-selected': haptics }"
          :aria-pressed="haptics"
          @click="haptics = !haptics"
        >
          Haptics
        </button>
      </div>
    </footer>
  </Pager>
</template>

<style>
.pager-demo {
  position: fixed;
  inset: 0;
  background: #0e0e0f;
  color: #f2f1ee;
  font-size: 13px;
  font-weight: 500;
}

.pager-demo-top,
.pager-demo-bottom {
  position: absolute;
  right: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  pointer-events: none;
}

.pager-demo-top {
  top: calc(env(safe-area-inset-top) + 16px);
  justify-content: space-between;
}

.pager-demo-bottom {
  bottom: calc(env(safe-area-inset-bottom) + 16px);
  flex-direction: column;
}

.pager-demo-mono {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px;
  color: rgb(242 241 238 / 60%);
}

.pager-demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pager-demo-row button {
  min-height: 40px;
  padding: 7px 14px;
  border: 1px solid rgb(242 241 238 / 16%);
  border-radius: 999px;
  background: rgb(242 241 238 / 6%);
  color: inherit;
  font: inherit;
  pointer-events: auto;
  cursor: pointer;
}

.pager-demo-row button:focus-visible {
  outline: 2px solid #f2f1ee;
  outline-offset: 2px;
}

.pager-demo-row button.is-selected {
  background: #f2f1ee;
  color: #111;
}
</style>
