<script setup>
import { useFullscreenImage } from "#src/composables/useFullscreenImage"
import { useToast } from "#src/composables/useToast"
import api from "#src/utils/api"
import { onMounted, onUnmounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const { hide: hideFullscreenImage, show: showFullscreenImage } = useFullscreenImage()
const { show: showToast } = useToast()
const router = useRouter()
const route = useRoute()
const image = ref(null)

const fetchImage = async () => {
  try {
    const response = await api.get(`/images/${route.params.id}`)
    image.value = response.data?.data?.image || null
  } catch (error) {
    router.push("/")
    const errorMessage = error.response?.data?.message || error.message || "Failed to fetch image."
    showToast({
      description: errorMessage,
      title: "Error fetching image",
      type: "error"
    })
  }
}

onMounted(async () => {
  await fetchImage()
  if (image.value) {
    showFullscreenImage(image.value, { updateRoute: false })
  }
})

onUnmounted(() => {
  image.value = null
  hideFullscreenImage()
})
</script>

<template>
  <slot />
</template>
