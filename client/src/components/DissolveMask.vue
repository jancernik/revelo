<script setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue"

const INVERTED = true
const FREQUENCY = "0.002 0.003"
const OCTAVES = 4
const STEPS = 500
const SEED = Math.floor(Math.random() * 10000) + 1

const progress = ref(0)
const svgElement = useTemplateRef("svg")
const observer = ref(null)

const updateFromDataAttribute = () => {
  if (!svgElement.value) return

  const dataProgress = svgElement.value.getAttribute("data-dissolve-progress")
  if (dataProgress !== null) {
    const newProgress = parseFloat(dataProgress)
    if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 1) {
      progress.value = newProgress
    }
  }
}

onMounted(() => {
  if (!svgElement.value) return

  updateFromDataAttribute()

  observer.value = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "data-dissolve-progress") {
        updateFromDataAttribute()
      }
    })
  })

  observer.value.observe(svgElement.value, {
    attributeFilter: ["data-dissolve-progress"],
    attributes: true
  })
})

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})

const tableValues = computed(() => {
  const values = []
  const threshold = 0.9 - progress.value * 0.9

  for (let i = 0; i < STEPS; i++) {
    const value = i / (STEPS - 1)
    const result = value > threshold ? 1 : 0
    values.push(INVERTED ? 1 - result : result)
  }

  return values.join(" ")
})
</script>

<template>
  <svg ref="svg" xmlns="http://www.w3.org/2000/svg" width="0" height="0" data-dissolve-progress="0">
    <defs>
      <filter id="dissolve-filter">
        <feTurbulence
          :baseFrequency="FREQUENCY"
          :numOctaves="OCTAVES"
          :seed="SEED"
          type="fractalNoise"
          result="noise"
        />
        <feColorMatrix in="noise" type="saturate" values="0" result="grayscale" />
        <feComponentTransfer in="grayscale" result="thresholded">
          <feFuncA type="discrete" :tableValues="tableValues" />
        </feComponentTransfer>

        <feFlood flood-color="#000000" result="black" />
        <feComposite in="black" in2="thresholded" operator="in" result="blackBlobs" />

        <feComposite in="blackBlobs" in2="SourceGraphic" operator="over" />
      </filter>
    </defs>
    <mask
      id="dissolve"
      maskUnits="userSpaceOnUse"
      maskContentUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="100vw"
      height="100vh"
    >
      <rect width="100vw" height="100vh" fill="white" filter="url(#dissolve-filter)" />
    </mask>
  </svg>
</template>
