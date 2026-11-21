import { defineStore } from "pinia"
import { ref, watch } from "vue"

import type { ApiSuccess } from "#src/types/api"
import type { Collection, Image } from "#src/types/models"

import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth"
import { useImagesStore } from "#src/stores/images"
import api, { errorMessage } from "#src/utils/api"
import { getFilenameFromDisposition, triggerDownload } from "#src/utils/download"

export type CachedCollection = CollectionRow & { images?: Image[] }

export interface CollectionFetchOptions {
  force?: boolean
}

export type CollectionInput = Partial<Pick<Collection, "description" | "title">>

type CollectionRow = Omit<Collection, "images">

function downloadFilename(disposition: unknown, fallback: string) {
  if (disposition !== null && disposition !== undefined && typeof disposition !== "string") {
    throw new Error("Invalid Content-Disposition header")
  }
  return getFilenameFromDisposition(disposition) || fallback
}

export const useCollectionsStore = defineStore("collections", () => {
  const { show: showToast } = useToast()
  const imagesStore = useImagesStore()
  const authStore = useAuthStore()

  const error = ref<null | string>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const collections = ref<CachedCollection[]>([])

  watch(
    () => authStore.accessToken,
    () => fetchAll({ force: true })
  )

  async function fetchAll(options: CollectionFetchOptions = {}) {
    const isAuthenticated = !!authStore.accessToken
    const { force } = options

    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const params = isAuthenticated ? { includeHidden: true } : {}
      const response = await api.get<ApiSuccess<{ collections: Collection[] }>>("/collections", {
        params
      })
      collections.value = response.data?.data?.collections || []
      initialized.value = true
      return collections.value
    } catch (err) {
      error.value = errorMessage(err)
      showToast({
        description: error.value,
        title: "Error Fetching Collections",
        type: "error"
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  function fetch(
    id: string,
    options: CollectionFetchOptions & { force: true }
  ): Promise<Collection | undefined>
  function fetch(
    id: string,
    options?: CollectionFetchOptions
  ): Promise<CachedCollection | undefined>
  async function fetch(
    id: string,
    options: CollectionFetchOptions = {}
  ): Promise<CachedCollection | undefined> {
    const { force } = options
    const isAuthenticated = !!authStore.accessToken
    try {
      if (!force) {
        const existing = collections.value.find((c) => c.id === id)
        if (existing) return existing
      }

      const params = isAuthenticated ? { includeHidden: true } : {}
      const response = await api.get<ApiSuccess<{ collection: Collection }>>(`/collections/${id}`, {
        params
      })
      const collection = response.data?.data?.collection

      if (collection) {
        const index = collections.value.findIndex((c) => c.id === id)
        if (index !== -1) {
          collections.value[index] = collection
        } else {
          collections.value.push(collection)
        }
      }

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Fetching Collection",
        type: "error"
      })
      throw error
    }
  }

  async function create(data: CollectionInput = {}): Promise<CollectionRow | undefined> {
    const { description, title } = data
    try {
      const response = await api.post<ApiSuccess<{ collection: CollectionRow }>>("/collections", {
        description,
        title
      })
      const collection = response.data?.data?.collection

      if (collection) collections.value.push(collection)

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Creating Collection",
        type: "error"
      })
      throw error
    }
  }

  async function update(
    id: string,
    data: CollectionInput = {}
  ): Promise<CollectionRow | undefined> {
    const { description, title } = data
    try {
      const response = await api.put<ApiSuccess<{ collection: CollectionRow }>>(
        `/collections/${id}`,
        { description, title }
      )
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Updating Collection",
        type: "error"
      })
      throw error
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/collections/${id}`)
      collections.value = collections.value.filter((c) => c.id !== id)
      clearImageMembership([id])
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Deleting Collection",
        type: "error"
      })
      throw error
    }
  }

  async function bulkRemove(ids: string[]) {
    try {
      await api.delete("/collections", { data: { ids } })
      collections.value = collections.value.filter((c) => !ids.includes(c.id))
      clearImageMembership(ids)
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Deleting Collections",
        type: "error"
      })
      throw error
    }
  }

  async function addImages(id: string, imageIds: string[]) {
    try {
      const existingImageIds = await getImageIdsInCollection(id)
      const newImageIds = [...new Set([...existingImageIds, ...imageIds])]

      const response = await api.put<ApiSuccess<{ collection: Collection | null }>>(
        `/collections/${id}/images`,
        { imageIds: newImageIds }
      )
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      if (collection?.images) {
        syncImageMembership(id, collection.images)
      } else {
        imageIds.forEach((imageId) => {
          imagesStore.updateLocal(imageId, {
            collectionId: id,
            collectionOrder: newImageIds.indexOf(imageId)
          })
        })
      }

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Adding Images",
        type: "error"
      })
      throw error
    }
  }

  async function removeImages(id: string, imageIds: string[]) {
    try {
      const existingImageIds = await getImageIdsInCollection(id)
      const newImageIds = existingImageIds.filter((imgId) => !imageIds.includes(imgId))

      const response = await api.put<ApiSuccess<{ collection: Collection | null }>>(
        `/collections/${id}/images`,
        { imageIds: newImageIds }
      )
      const collection = response.data?.data?.collection

      const index = collections.value.findIndex((c) => c.id === id)
      if (index !== -1) collections.value[index] = { ...collections.value[index], ...collection }

      if (collection?.images) {
        syncImageMembership(id, collection.images)
      } else {
        imageIds.forEach((id) => {
          imagesStore.updateLocal(id, { collectionId: null, collectionOrder: null })
        })
      }

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Removing Images",
        type: "error"
      })
      throw error
    }
  }

  async function setImages(id: string, imageIds: string[]) {
    try {
      const collectionIndex = collections.value.findIndex((c) => c.id === id)
      const existingImages = collections.value[collectionIndex]?.images || []
      const removedImageIds = existingImages
        .map((img) => img.id)
        .filter((imageId) => !imageIds.includes(imageId))

      const response = await api.put<ApiSuccess<{ collection: Collection | null }>>(
        `/collections/${id}/images`,
        { imageIds }
      )
      const collection = response.data?.data?.collection

      if (collectionIndex !== -1) {
        const findImage = (imageId: string) =>
          existingImages.find((img) => img.id === imageId) ||
          imagesStore.images.find((img) => img.id === imageId)

        collections.value[collectionIndex] = {
          ...collections.value[collectionIndex],
          ...collection,
          images:
            collection?.images ??
            imageIds
              .map(findImage)
              .filter((image): image is Image => Boolean(image))
              .map((img, order) => ({ ...img, collectionOrder: order }))
        }
      }

      if (collection?.images) {
        syncImageMembership(id, collection.images)
      } else {
        removedImageIds.forEach((imageId) => {
          imagesStore.updateLocal(imageId, { collectionId: null, collectionOrder: null })
        })
        imageIds.forEach((imageId, order) => {
          imagesStore.updateLocal(imageId, { collectionId: id, collectionOrder: order })
        })
      }

      return collection
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Setting Images",
        type: "error"
      })
      throw error
    }
  }

  async function download(id: string) {
    try {
      const response = await api.get<Blob>(`/collections/${id}/download`, { responseType: "blob" })
      const filename = downloadFilename(response.headers["content-disposition"], "collection.zip")
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: (error instanceof Error && error.message) || "Failed to download collection.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function bulkDownload(ids: string[]) {
    try {
      const response = await api.post<Blob>(
        "/collections/download",
        { ids },
        { responseType: "blob" }
      )
      const filename = downloadFilename(response.headers["content-disposition"], "collections.zip")
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: (error instanceof Error && error.message) || "Failed to download collections.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function getImageIdsInCollection(collectionOrId: CachedCollection | null | string) {
    const collection =
      typeof collectionOrId === "object"
        ? collectionOrId
        : await fetch(collectionOrId, { force: true })
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

  function updateImageLocal(id: string, image?: Partial<Image>) {
    collections.value.some((collection) => {
      const collectionImages = collection.images
      const imageIndex = collectionImages?.findIndex((i) => i.id === id)
      if (collectionImages && imageIndex !== undefined && imageIndex >= 0) {
        collectionImages[imageIndex] = {
          ...collectionImages[imageIndex],
          ...image
        }
        return true
      }
      return false
    })
  }

  function clearImageMembership(collectionIds: string[]) {
    imagesStore.images
      .filter((image) => image.collectionId !== null && collectionIds.includes(image.collectionId))
      .forEach((image) => {
        imagesStore.updateLocal(image.id, { collectionId: null, collectionOrder: null })
      })
  }

  // The membership response lists every current member with its server-assigned order.
  function syncImageMembership(id: string, members: Image[]) {
    const memberIds = members.map((image) => image.id)
    imagesStore.images
      .filter((image) => image.collectionId === id && !memberIds.includes(image.id))
      .forEach((image) => {
        imagesStore.updateLocal(image.id, { collectionId: null, collectionOrder: null })
      })
    members.forEach((image) => {
      imagesStore.updateLocal(image.id, {
        collectionId: image.collectionId,
        collectionOrder: image.collectionOrder
      })
    })
  }

  function removeImageLocal(id: string) {
    collections.value.forEach((collection, index) => {
      if (collection.images) {
        collections.value[index].images = collection.images.filter((i) => i.id !== id)
      }
    })
  }

  return {
    addImages,
    bulkDownload,
    bulkRemove,
    collections,
    create,
    download,
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
