<script setup>
import ImageGallery from "#src/components/images/ImageGallery.vue"
import { useTheme } from "#src/composables/useTheme"
import { onMounted, ref } from "vue"
import { useRoute } from "vue-router"

const { registerImageGallery } = useTheme()
const imageGallery = ref()
const route = useRoute()

onMounted(() => {
  if (imageGallery.value) {
    registerImageGallery(imageGallery.value)
  }
})
</script>

<template>
  <ImageGallery
    ref="imageGallery"
    :columns="route.query.columns ? Number(route.query.columns) : null"
    :alternating-scroll="route.query.alternating === 'true'"
    :continuous-scroll="route.query.continuous === 'true'"
    :menu-visible="route.query.menu === 'false' ? false : true"
    :scroll-speed="route.query.speed ? Number(route.query.speed) : 20"
  />
</template>

<style lang="scss"></style>
