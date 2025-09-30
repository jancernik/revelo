<script setup>
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useMenu } from "#src/composables/useMenu"
import { useImagesStore } from "#src/stores/images"
import { onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"

const { hide: hideFullscreenImage, show: showFullscreenImage } = useFullscreenImage()
const { hide: hideMenu } = useMenu()
const imagesStore = useImagesStore()
const router = useRouter()
const image = ref(null)

const props = defineProps({
  id: { required: true, type: String }
})

const fetchImage = async () => {
  try {
    image.value = await imagesStore.fetch(props.id)
  } catch {
    router.push("/")
  }
}

onMounted(async () => {
  hideMenu(false)
  await fetchImage()
  showFullscreenImage(image.value, { updateRoute: false })
})

onUnmounted(() => {
  hideFullscreenImage()
})
</script>

<template>
  <slot />
</template>
