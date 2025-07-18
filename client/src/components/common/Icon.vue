<script setup>
import { defineAsyncComponent, markRaw, onMounted, ref, watch } from "vue"

const props = defineProps({
  color: {
    default: "currentColor",
    type: String
  },
  defaultClass: {
    default: "icon",
    type: String
  },
  name: {
    required: true,
    type: String
  },
  size: {
    default: 24,
    type: [String, Number]
  },
  strokeWidth: {
    default: 2,
    type: Number
  }
})

const loadedIcon = ref(null)

const loadIcon = async () => {
  try {
    const icon = defineAsyncComponent(async () => (await import("lucide-vue-next"))[props.name])
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
