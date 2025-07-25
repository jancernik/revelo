import { useToast } from "#src/composables/useToast"
import api from "#src/utils/api"
import { debounce } from "#src/utils/helpers"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useImagesStore = defineStore("images", () => {
  const { show: showToast } = useToast()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const images = ref([])
  const filteredImages = ref([])

  async function fetchImages(force = false) {
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const response = await api.get("/images")
      images.value = response.data?.data?.images || []
      filteredImages.value = images.value
      initialized.value = true
    } catch (error) {
      error.value = error.response?.data?.message || error.message
      showToast({
        description: error.value,
        duration: 3,
        title: "Error Fetching Images",
        type: "error"
      })
    } finally {
      loading.value = false
    }
  }

  const search = debounce(async (query) => {
    const text = query.toString().toLowerCase().trim()
    if (!text) {
      filteredImages.value = images.value
    } else {
      loading.value = true
      error.value = null

      try {
        const response = await api.get("/images/search", { params: { text } })
        filteredImages.value = response.data?.data?.images || []
      } catch (error) {
        error.value = error.response?.data?.message || error.message
        showToast({
          description: error.value,
          duration: 3,
          title: "Error Fetching Images",
          type: "error"
        })
      } finally {
        loading.value = false
      }
    }
  }, 600)

  async function initialize() {
    if (!initialized.value) {
      await fetchImages()
    }
  }

  async function refreshImages() {
    return fetchImages(true)
  }

  return {
    error,
    fetchImages,
    filteredImages,
    images,
    initialize,
    initialized,
    loading,
    refreshImages,
    search
  }
})
