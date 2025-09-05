import { useToast } from "#src/composables/useToast"
import api from "#src/utils/api"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useCollectionsStore = defineStore("collections", () => {
  const { show: showToast } = useToast()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const collections = ref([])

  async function fetchAll(force = false) {
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const response = await api.get("/collections")
      collections.value = response.data?.data?.collections || []
      initialized.value = true
    } catch (error) {
      error.value = error.response?.data?.message || error.message
      showToast({
        description: error.value,
        title: "Error Fetching Collections",
        type: "error"
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetch(id) {
    try {
      const response = await api.get(`/collections/${id}`)
      return response.data?.data?.collection
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Fetching Collection",
        type: "error"
      })
      throw error
    }
  }

  async function create(data) {
    const { description, title } = data
    try {
      const response = await api.post("/collections", { description, title })
      collections.value.push(response.data?.data?.collection)
      return response.data
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Creating Collection",
        type: "error"
      })
      throw error
    }
  }

  async function update(id, data) {
    const { description, title } = data
    try {
      const response = await api.put(`/collections/${id}`, { description, title })
      const updatedCollection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        collections.value[index] = { ...collections.value[index], ...updatedCollection }
      }
      return response.data
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Updating Collection",
        type: "error"
      })
      throw error
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/collections/${id}`)
      collections.value = collections.value.filter((c) => c.id !== id)
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Deleting Collection",
        type: "error"
      })
      throw error
    }
  }

  async function addImages(id, imageIds) {
    try {
      const existingImageIds = imageIdsInCollection(id)
      const newImageIds = [...new Set([...existingImageIds, ...imageIds])]

      const response = await api.put(`/collections/${id}/images`, { imageIds: newImageIds })

      const updatedCollection = response.data?.data?.collection
      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        collections.value[index] = { ...collections.value[index], ...updatedCollection }
      }

      return response.data
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Adding Images",
        type: "error"
      })
      throw error
    }
  }

  async function removeImages(id, imageIds) {
    try {
      const existingImageIds = imageIdsInCollection(id)
      const newImageIds = existingImageIds.filter((imgId) => !imageIds.includes(imgId))

      const response = await api.put(`/collections/${id}/images`, { imageIds: newImageIds })

      const updatedCollection = response.data?.data?.collection
      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        collections.value[index] = { ...collections.value[index], ...updatedCollection }
      }

      return response.data
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Removing Images",
        type: "error"
      })
      throw error
    }
  }

  async function setImages(id, imageIds) {
    try {
      const response = await api.put(`/collections/${id}/images`, { imageIds })

      const updatedCollection = response.data?.data?.collection
      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        collections.value[index] = { ...collections.value[index], ...updatedCollection }
      }

      return response.data
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Setting Images",
        type: "error"
      })
      throw error
    }
  }

  function imageIdsInCollection(id) {
    return (
      collections.value
        .find((c) => c.id === id)
        ?.images?.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0))
        .map((img) => img.id) || []
    )
  }

  async function initialize() {
    if (!initialized.value) {
      await fetchAll()
    }
  }

  async function refreshCollections() {
    return fetchAll(true)
  }

  return {
    addImages,
    collections,
    create,
    error,
    fetch,
    fetchAll,
    imageIdsInCollection,
    initialize,
    initialized,
    loading,
    refreshCollections,
    remove,
    removeImages,
    setImages,
    update
  }
})
