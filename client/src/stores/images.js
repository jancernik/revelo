import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections.js"
import api from "#src/utils/api"
import { debounce } from "#src/utils/helpers"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useImagesStore = defineStore("images", () => {
  const { show: showToast } = useToast()
  const collectionsStore = useCollectionsStore()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const images = ref([])
  const filteredImages = ref([])
  const orderBy = ref(null)
  const order = ref("asc")

  async function fetchAll(options = {}) {
    const { force } = options
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const params = {}
      if (orderBy.value) {
        params.orderBy = orderBy.value
        params.order = order.value
      }

      const response = await api.get("/images", { params })
      images.value = response.data?.data?.images || []
      filteredImages.value = images.value
      initialized.value = true
      return images.value
    } catch (error) {
      error.value = error.response?.data?.message || error.message
      showToast({
        description: error.value,
        title: "Error Fetching Images",
        type: "error"
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetch(id, options = {}) {
    const { force } = options
    try {
      if (!force) {
        const existing = images.value.find((i) => i.id === id)
        if (existing) return existing
      }

      const response = await api.get(`/images/${id}`)
      return response.data?.data?.image
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Fetching Image",
        type: "error"
      })
      throw error
    }
  }

  async function uploadForReview(images) {
    try {
      const formData = new FormData()
      images.forEach((image) => formData.append("images", image))

      const response = await api.post("/upload/review", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      return response.data?.data?.images || []
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Uploading Images",
        type: "error"
      })
      throw error
    }
  }

  async function confirmUpload(imageData) {
    try {
      const response = await api.post("/upload/confirm", { images: imageData })
      const newImages = response.data?.data?.images || []

      images.value.push(...newImages)

      return newImages
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Confirming Images",
        type: "error"
      })
      throw error
    }
  }

  async function updateMetadata(id, metadata) {
    try {
      const response = await api.put(`/images/${id}/metadata`, metadata)
      const image = response.data?.data?.image

      updateLocal(id, image)
      collectionsStore.updateImageLocal(id, image)

      return image
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Updating Metadata",
        type: "error"
      })
      throw error
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/images/${id}`)
      images.value = images.value.filter((i) => i.id !== id)
      collectionsStore.removeImageLocal(id)
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Deleting Image",
        type: "error"
      })
      throw error
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
          title: "Error Fetching Images",
          type: "error"
        })
        throw error
      } finally {
        loading.value = false
      }
    }
  }, 300)

  async function initialize() {
    if (!initialized.value) {
      await fetchAll()
    }
  }

  async function refreshImages() {
    return fetchAll({ force: true })
  }

  function updateLocal(id, image) {
    const index = images.value.findIndex((i) => i.id === id)
    if (index !== -1) images.value[index] = { ...images.value[index], ...image }
  }

  function setOrder(options = {}) {
    const { order: newOrder, orderBy: newOrderBy } = options
    orderBy.value = newOrderBy
    order.value = newOrder

    fetchAll({ force: true })
  }

  return {
    confirmUpload,
    error,
    fetch,
    fetchAll,
    filteredImages,
    images,
    initialize,
    initialized,
    loading,
    order,
    orderBy,
    refreshImages,
    remove,
    search,
    setOrder,
    updateLocal,
    updateMetadata,
    uploadForReview
  }
})
