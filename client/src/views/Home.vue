<script setup>
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"

import ImageGallery from "#src/components/images/ImageGallery.vue"
import NativeImageGallery from "#src/components/images/NativeImageGallery.vue"
import { useDevice } from "#src/composables/useDevice"
import { useSettings } from "#src/composables/useSettings"
import { useTheme } from "#src/composables/useTheme"

const { registerImageGallery } = useTheme()
const { isTouchPrimary } = useDevice()
const { settings } = useSettings()
const imageGallery = ref()
const route = useRoute()

const columns = computed(() => (route.query.columns ? Number(route.query.columns) : null))
const alternatingScroll = computed(() => route.query.alternating === "true")
const continuousScroll = computed(() => route.query.continuous === "true")
const menuVisible = computed(() => route.query.menu !== "false")
const scrollSpeed = computed(() => (route.query.speed ? Number(route.query.speed) : 20))

const useNativeGallery = computed(() => {
  if (alternatingScroll.value || continuousScroll.value) return false
  if (route.query.native === "true") return true
  if (route.query.native === "false") return false
  return isTouchPrimary.value && !!settings.value.nativeScroll
})

watch(imageGallery, (gallery) => registerImageGallery(gallery), { immediate: true })
</script>

<template>
  <NativeImageGallery
    v-if="useNativeGallery"
    ref="imageGallery"
    :columns="columns"
    :menu-visible="menuVisible"
  />
  <ImageGallery
    v-else
    ref="imageGallery"
    :columns="columns"
    :alternating-scroll="alternatingScroll"
    :continuous-scroll="continuousScroll"
    :menu-visible="menuVisible"
    :scroll-speed="scrollSpeed"
  />
</template>

<style lang="scss"></style>
