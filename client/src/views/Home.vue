<script setup>
import ImageGallery from "#src/components/images/ImageGallery.vue"
import { useTheme } from "#src/composables/useTheme"
import { onMounted, ref } from "vue"

const { registerImageGallery } = useTheme()
const imageGallery = ref()

onMounted(() => {
  if (imageGallery.value) {
    registerImageGallery(imageGallery.value)
  }
})
</script>

<template>
  <ImageGallery ref="imageGallery" />
</template>

<style lang="scss"></style>
