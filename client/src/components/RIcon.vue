<script setup>
import { ref, watch, onMounted, defineAsyncComponent } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 24
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  strokeWidth: {
    type: Number,
    default: 1.5
  },
  defaultClass: {
    type: String,
    default: 'r-icon'
  }
})

const loadedIcon = ref(null)

const loadIcon = async () => {
  try {
    loadedIcon.value = defineAsyncComponent(
      async () => (await import('lucide-vue-next'))[props.name]
    )
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
  <component
    :is="loadedIcon"
    v-if="loadedIcon"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :default-class="defaultClass"
  />
</template>
