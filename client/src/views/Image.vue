<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'

const { show: showFullscreenImage, hide: hideFullscreenImage } = useFullscreenImage()
const { show: showToast } = useToast()
const router = useRouter()
const route = useRoute()
const image = ref(null)

const fetchImage = async () => {
  try {
    const response = await api.get(`/images/${route.params.id}`)
    image.value = response.data
  } catch (error) {
    router.push('/')
    showToast({
      type: 'error',
      title: 'Error fetching image',
      description: error.message,
      duration: 5
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
