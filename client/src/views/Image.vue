<script setup>
import { onMounted, onUnmounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useFullscreenImage } from "@/composables/useFullscreenImage"
import { useToast } from "@/composables/useToast"
import api from "@/utils/api"

const { hide: hideFullscreenImage, show: showFullscreenImage } = useFullscreenImage()
const { show: showToast } = useToast()
const router = useRouter()
const route = useRoute()
const image = ref(null)

const fetchImage = async () => {
  try {
    const response = await api.get(`/images/${route.params.id}`)
    image.value = response.data
  } catch (error) {
    router.push("/")
    showToast({
      description: error.message,
      duration: 5,
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
