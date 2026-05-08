import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth.js"
import { useCollectionsStore } from "#src/stores/collections.js"
import api from "#src/utils/api"
import { getFilenameFromDisposition, triggerDownload } from "#src/utils/download"
import { debounce } from "#src/utils/helpers"

export const useImagesStore = defineStore("images", () => {
  const { show: showToast } = useToast()
  const collectionsStore = useCollectionsStore()
  const authStore = useAuthStore()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const images = ref([])
  const filteredImages = ref([])
  const orderBy = ref(null)
  const order = ref("asc")

  const visibleFilteredImages = computed(() => filteredImages.value.filter((img) => !img.hidden))

  watch(
    () => authStore.accessToken,
    () => fetchAll({ force: true })
  )

  async function fetchAll(options = {}) {
    const isAuthenticated = !!authStore.accessToken
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
      if (isAuthenticated) params.includeHidden = true

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
    const isAuthenticated = !!authStore.accessToken
    try {
      if (!force) {
        const existing = images.value.find((i) => i.id === id)
        if (existing) return existing
      }

      const params = isAuthenticated ? { includeHidden: true } : {}
      const response = await api.get(`/images/${id}`, { params })
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
      filteredImages.value = filteredImages.value.filter((i) => i.id !== id)
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

  async function bulkRemove(ids) {
    try {
      await api.delete("/images", { data: { ids } })
      images.value = images.value.filter((i) => !ids.includes(i.id))
      filteredImages.value = filteredImages.value.filter((i) => !ids.includes(i.id))
      ids.forEach((id) => collectionsStore.removeImageLocal(id))
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Deleting Images",
        type: "error"
      })
      throw error
    }
  }

  async function download(id) {
    try {
      const response = await api.get(`/images/${id}/download`, { responseType: "blob" })
      const filename =
        getFilenameFromDisposition(response.headers["content-disposition"]) || "image.jpg"
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: error.message || "Failed to download image.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function bulkDownload(ids) {
    try {
      const response = await api.post("/images/download", { ids }, { responseType: "blob" })
      const filename =
        getFilenameFromDisposition(response.headers["content-disposition"]) || "images.zip"
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: error.message || "Failed to download images.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function toggleHidden(id, hidden) {
    return updateMetadata(id, { hidden })
  }

  async function bulkToggleHidden(ids, hidden) {
    return bulkUpdateMetadata(ids, { hidden })
  }

  async function bulkUpdateMetadata(ids, metadata) {
    try {
      const response = await api.put("/images/metadata", { ids, metadata })
      const updatedImages = response.data?.data?.images || []

      updatedImages.forEach((image) => {
        updateLocal(image.id, image)
        collectionsStore.updateImageLocal(image.id, image)
      })

      return updatedImages
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Updating Metadata",
        type: "error"
      })
      throw error
    }
  }

  const search = debounce(async (query) => {
    const isAuthenticated = !!authStore.accessToken
    const text = query.toString().toLowerCase().trim()
    if (!text) {
      filteredImages.value = images.value
    } else {
      loading.value = true
      error.value = null

      try {
        const params = { text }
        if (isAuthenticated) params.includeHidden = true
        const response = await api.get("/images/search", { params })
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
    bulkDownload,
    bulkRemove,
    bulkToggleHidden,
    bulkUpdateMetadata,
    confirmUpload,
    download,
    error,
    fetch,
    fetchAll,
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
    toggleHidden,
    updateLocal,
    updateMetadata,
    uploadForReview,
    visibleFilteredImages
  }
})
