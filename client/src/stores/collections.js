import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images.js"
import api from "#src/utils/api"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useCollectionsStore = defineStore("collections", () => {
  const { show: showToast } = useToast()
  const imagesStore = useImagesStore()

  const error = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const collections = ref([])

  async function fetchAll(options = {}) {
    const { force } = options
    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const response = await api.get("/collections")
      collections.value = response.data?.data?.collections || []
      initialized.value = true
      return collections.value
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

  async function fetch(id, options = {}) {
    const { force } = options
    try {
      if (!force) {
        const existing = collections.value.find((c) => c.id === id)
        if (existing) return existing
      }

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

  async function create(data = {}) {
    const { description, title } = data
    try {
      const response = await api.post("/collections", { description, title })
      const collection = response.data?.data?.collection

      if (collection) collections.value.push(collection)

      return collection
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Creating Collection",
        type: "error"
      })
      throw error
    }
  }

  async function update(id, data = {}) {
    const { description, title } = data
    try {
      const response = await api.put(`/collections/${id}`, { description, title })
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      return collection
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

  async function bulkRemove(ids) {
    try {
      await api.delete("/collections", { data: { ids } })
      collections.value = collections.value.filter((c) => !ids.includes(c.id))
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Deleting Collections",
        type: "error"
      })
      throw error
    }
  }

  async function addImages(id, imageIds) {
    try {
      const existingImageIds = await getImageIdsInCollection(id)
      const newImageIds = [...new Set([...existingImageIds, ...imageIds])]

      const response = await api.put(`/collections/${id}/images`, { imageIds: newImageIds })
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      imageIds.forEach((imageId) => {
        imagesStore.updateLocal(imageId, {
          collectionId: id,
          collectionOrder: newImageIds.indexOf(imageId)
        })
      })

      return collection
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
      const existingImageIds = await getImageIdsInCollection(id)
      const newImageIds = existingImageIds.filter((imgId) => !imageIds.includes(imgId))

      const response = await api.put(`/collections/${id}/images`, { imageIds: newImageIds })
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      imageIds.forEach((id) => {
        imagesStore.updateLocal(id, { collectionId: null, collectionOrder: null })
      })

      return collection
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
      const collectionIndex = collections.value.findIndex((c) => c.id === id)
      const existingImages = collections.value[collectionIndex]?.images || []
      const removedImageIds = existingImages
        .map((img) => img.id)
        .filter((imageId) => !imageIds.includes(imageId))

      const response = await api.put(`/collections/${id}/images`, { imageIds })
      const collection = response.data?.data?.collection

      if (collectionIndex !== -1) {
        const findImage = (imageId) =>
          existingImages.find((img) => img.id === imageId) ||
          imagesStore.images.find((img) => img.id === imageId)

        collections.value[collectionIndex] = {
          ...collections.value[collectionIndex],
          ...collection,
          images: imageIds
            .map(findImage)
            .filter(Boolean)
            .map((img, order) => ({ ...img, collectionOrder: order }))
        }
      }

      removedImageIds.forEach((imageId) => {
        imagesStore.updateLocal(imageId, { collectionId: null, collectionOrder: null })
      })
      imageIds.forEach((imageId, order) => {
        imagesStore.updateLocal(imageId, { collectionId: id, collectionOrder: order })
      })

      return collection
    } catch (error) {
      showToast({
        description: error.response?.data?.message || error.message,
        title: "Error Setting Images",
        type: "error"
      })
      throw error
    }
  }

  async function getImageIdsInCollection(collectionOrId) {
    const collection =
      typeof collectionOrId === "object" ? collectionOrId : await fetch(collectionOrId)
    return (
      collection?.images
        ?.sort((a, b) => (a.collectionOrder || 0) - (b.collectionOrder || 0))
        .map((image) => image.id) || []
    )
  }

  async function initialize() {
    if (!initialized.value) {
      await fetchAll()
    }
  }

  async function refreshCollections() {
    return fetchAll({ force: true })
  }

  function updateImageLocal(id, image) {
    collections.value.some((collection, collectionIndex) => {
      const imageIndex = collection.images?.findIndex((i) => i.id === id)
      if (imageIndex !== -1) {
        collections.value[collectionIndex].images[imageIndex] = {
          ...collections.value[collectionIndex].images[imageIndex],
          ...image
        }
        return true
      }
      return false
    })
  }

  function removeImageLocal(id) {
    collections.value.forEach((collection, index) => {
      if (collection.images) {
        collections.value[index].images = collection.images.filter((i) => i.id !== id)
      }
    })
  }

  return {
    addImages,
    bulkRemove,
    collections,
    create,
    error,
    fetch,
    fetchAll,
    getImageIdsInCollection,
    initialize,
    initialized,
    loading,
    refreshCollections,
    remove,
    removeImageLocal,
    removeImages,
    setImages,
    update,
    updateImageLocal
  }
})
