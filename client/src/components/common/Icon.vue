<script setup lang="ts">
import type { Component } from "vue"

import { defineAsyncComponent, markRaw, onMounted, ref, watch } from "vue"

import type { IconName } from "#src/components/common/types"

const props = withDefaults(
  defineProps<{
    color?: string
    defaultClass?: string
    name: IconName
    size?: number | string
    strokeWidth?: number
  }>(),
  {
    color: "currentColor",
    defaultClass: "icon",
    size: 24,
    strokeWidth: 2
  }
)

const loadedIcon = ref<Component | null>(null)

const loadIcon = async () => {
  try {
    const icon = defineAsyncComponent(async () => (await import("@lucide/vue"))[props.name])
    loadedIcon.value = markRaw(icon)
  } catch (error) {
    console.error(`Failed to load icon: ${props.name}`, error)
    loadedIcon.value = null
  }
}

onMounted(() => {
  if (props.name) {
    loadIcon()
  }
})

watch(
  () => props.name,
  () => {
    loadIcon()
  }
)
</script>

<template>
  <span
    :class="defaultClass"
    :style="{
      width: `${size}px`,
      height: `${size}px`
    }"
  >
    <component
      :is="loadedIcon"
      v-if="loadedIcon"
      :size="size"
      :color="color"
      :stroke-width="strokeWidth"
      :default-class="defaultClass"
    />
  </span>
</template>
