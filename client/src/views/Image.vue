<script setup>
import { useRoute } from 'vue-router'
import { onMounted, ref } from 'vue'
import { useFullscreenImage } from '@/composables/useFullscreenImage'
import api from '@/utils/api'

const route = useRoute()
const image = ref(null)
const { show } = useFullscreenImage()

const fetchImage = async () => {
  try {
    const response = await api.get(`/images/${route.params.id}`)
    image.value = response.data
  } catch (error) {
    console.error('Error fetching image:', error)
  }
}

onMounted(async () => {
  await fetchImage()
  if (image.value) {
    show(image.value)
  }
})
</script>
