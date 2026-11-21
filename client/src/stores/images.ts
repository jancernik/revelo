import type { AxiosResponse } from "axios"

import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import type { ApiSuccess } from "#src/types/api"
import type {
  Image,
  ImageDescription,
  ImageDescriptions,
  ImageMetadataForm,
  UploadedImage,
  UploadReview
} from "#src/types/models"

import { useToast } from "#src/composables/useToast"
import { useAuthStore } from "#src/stores/auth"
import { useCollectionsStore } from "#src/stores/collections"
import api, { errorMessage } from "#src/utils/api"
import { getFilenameFromDisposition, triggerDownload } from "#src/utils/download"
import { debounce } from "#src/utils/helpers"

export interface ImageFetchOptions {
  force?: boolean
}

export type ImageMetadataUpdate = Partial<{
  [Key in keyof ImageMetadataForm]: Key extends "iso"
    ? ImageMetadataForm[Key] | null | number
    : ImageMetadataForm[Key] | null
}> & { hidden?: boolean }

export interface ImageOrderOptions {
  order?: "asc" | "desc"
  orderBy?: "date" | "id" | null
}

export interface UploadConfirmation {
  metadata?: ImageMetadataUpdate
  sessionId: string
}

type DescriptionsResponse = ApiSuccess<{ descriptions: ImageDescription[] }>

interface ImageQuery {
  includeHidden?: boolean
  order?: "asc" | "desc"
  orderBy?: "date" | "id"
  text?: string
}

function downloadFilename(disposition: unknown, fallback: string) {
  if (disposition !== null && disposition !== undefined && typeof disposition !== "string") {
    throw new Error("Invalid Content-Disposition header")
  }
  return getFilenameFromDisposition(disposition) || fallback
}

export const useImagesStore = defineStore("images", () => {
  const { show: showToast } = useToast()
  const collectionsStore = useCollectionsStore()
  const authStore = useAuthStore()

  const error = ref<null | string>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const images = ref<Image[]>([])
  const filteredImages = ref<Image[]>([])
  const orderBy = ref<ImageOrderOptions["orderBy"]>(null)
  const order = ref<ImageOrderOptions["order"]>("asc")

  const visibleFilteredImages = computed(() => filteredImages.value.filter((img) => !img.hidden))

  watch(
    () => authStore.accessToken,
    () => fetchAll({ force: true })
  )

  async function fetchAll(options: ImageFetchOptions = {}) {
    const isAuthenticated = !!authStore.accessToken
    const { force } = options

    if (loading.value && !force) return
    if (initialized.value && !force) return

    loading.value = true
    error.value = null

    try {
      const params: ImageQuery = {}
      if (orderBy.value) {
        params.orderBy = orderBy.value
        params.order = order.value
      }
      if (isAuthenticated) params.includeHidden = true

      const response = await api.get<ApiSuccess<{ images: Image[] }>>("/images", { params })
      images.value = response.data?.data?.images || []
      filteredImages.value = images.value
      initialized.value = true
      return images.value
    } catch (err) {
      error.value = errorMessage(err)
      showToast({
        description: error.value,
        title: "Error Fetching Images",
        type: "error"
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetch(id: string, options: ImageFetchOptions = {}) {
    const { force } = options
    const isAuthenticated = !!authStore.accessToken
    try {
      if (!force) {
        const existing = images.value.find((i) => i.id === id)
        if (existing) return existing
      }

      const params = isAuthenticated ? { includeHidden: true } : {}
      const response = await api.get<ApiSuccess<{ image: Image }>>(`/images/${id}`, { params })
      return response.data?.data?.image
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Fetching Image",
        type: "error"
      })
      throw error
    }
  }

  async function uploadForReview(images: File[]) {
    try {
      const formData = new FormData()
      images.forEach((image) => formData.append("images", image))

      const response = await api.post<ApiSuccess<{ images: UploadReview[] }>>(
        "/upload/review",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      )

      return response.data?.data?.images || []
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Uploading Images",
        type: "error"
      })
      throw error
    }
  }

  async function confirmUpload(imageData: UploadConfirmation[]) {
    try {
      const response = await api.post<ApiSuccess<{ images: UploadedImage[] }>>("/upload/confirm", {
        images: imageData
      })
      const newImages = response.data?.data?.images || []

      images.value.push(...newImages)

      return newImages
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Confirming Images",
        type: "error"
      })
      throw error
    }
  }

  async function updateMetadata(id: string, metadata: ImageMetadataUpdate) {
    try {
      const response = await api.put<ApiSuccess<{ image: Image }>>(
        `/images/${id}/metadata`,
        metadata
      )
      const image = response.data?.data?.image

      updateLocal(id, image)
      collectionsStore.updateImageLocal(id, image)

      return image
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Updating Metadata",
        type: "error"
      })
      throw error
    }
  }

  function setDescriptionsLocal(id: string, list: ImageDescription[]) {
    const descriptions: ImageDescriptions = {}
    for (const item of list) {
      if (item.text !== null) descriptions[item.language] = item.text
    }
    updateLocal(id, { descriptions })
    collectionsStore.updateImageLocal(id, { descriptions })
  }

  async function descriptionRequest(
    id: string,
    errorTitle: string,
    send: () => Promise<AxiosResponse<DescriptionsResponse>>
  ) {
    try {
      const response = await send()
      const list = response.data?.data?.descriptions || []
      setDescriptionsLocal(id, list)

      return list
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: errorTitle,
        type: "error"
      })
      throw error
    }
  }

  async function fetchDescriptions(id: string) {
    return descriptionRequest(id, "Error Loading Descriptions", () =>
      api.get<DescriptionsResponse>(`/images/${id}/descriptions`)
    )
  }

  async function updateDescription(id: string, language: string, text: string) {
    return descriptionRequest(id, "Error Saving Description", () =>
      api.put<DescriptionsResponse>(`/images/${id}/descriptions/${language}`, { text })
    )
  }

  /** Discards the given languages, or all of them, so the server writes them again. */
  async function regenerateDescriptions(id: string, languages?: string[]) {
    return descriptionRequest(id, "Error Regenerating Description", () =>
      api.post<DescriptionsResponse>(
        `/images/${id}/descriptions/regenerate`,
        languages ? { languages } : {}
      )
    )
  }

  async function remove(id: string) {
    try {
      await api.delete(`/images/${id}`)
      images.value = images.value.filter((i) => i.id !== id)
      filteredImages.value = filteredImages.value.filter((i) => i.id !== id)
      collectionsStore.removeImageLocal(id)
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Deleting Image",
        type: "error"
      })
      throw error
    }
  }

  async function bulkRemove(ids: string[]) {
    try {
      await api.delete("/images", { data: { ids } })
      images.value = images.value.filter((i) => !ids.includes(i.id))
      filteredImages.value = filteredImages.value.filter((i) => !ids.includes(i.id))
      ids.forEach((id) => collectionsStore.removeImageLocal(id))
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Deleting Images",
        type: "error"
      })
      throw error
    }
  }

  async function download(id: string) {
    try {
      const response = await api.get<Blob>(`/images/${id}/download`, { responseType: "blob" })
      const filename = downloadFilename(response.headers["content-disposition"], "image.jpg")
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: (error instanceof Error && error.message) || "Failed to download image.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function bulkDownload(ids: string[]) {
    try {
      const response = await api.post<Blob>("/images/download", { ids }, { responseType: "blob" })
      const filename = downloadFilename(response.headers["content-disposition"], "images.zip")
      triggerDownload(response.data, filename)
    } catch (error) {
      showToast({
        description: (error instanceof Error && error.message) || "Failed to download images.",
        title: "Download Failed",
        type: "error"
      })
      throw error
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    return updateMetadata(id, { hidden })
  }

  async function bulkToggleHidden(ids: string[], hidden: boolean) {
    return bulkUpdateMetadata(ids, { hidden })
  }

  async function bulkUpdateMetadata(ids: (null | string)[], metadata: ImageMetadataUpdate) {
    try {
      const response = await api.put<ApiSuccess<{ images: Image[] }>>("/images/metadata", {
        ids,
        metadata
      })
      const updatedImages = response.data?.data?.images || []

      updatedImages.forEach((image) => {
        updateLocal(image.id, image)
        collectionsStore.updateImageLocal(image.id, image)
      })

      return updatedImages
    } catch (error) {
      showToast({
        description: errorMessage(error),
        title: "Error Updating Metadata",
        type: "error"
      })
      throw error
    }
  }

  const search = debounce(async (query: string) => {
    const isAuthenticated = !!authStore.accessToken
    const text = query.toString().toLowerCase().trim()
    if (!text) {
      filteredImages.value = images.value
    } else {
      loading.value = true
      error.value = null

      try {
        const params: ImageQuery = { text }
        if (isAuthenticated) params.includeHidden = true
        const response = await api.get<ApiSuccess<{ images: Image[] }>>("/images/search", {
          params
        })
        filteredImages.value = response.data?.data?.images || []
      } catch (err) {
        error.value = errorMessage(err)
        showToast({
          description: error.value,
          title: "Error Fetching Images",
          type: "error"
        })
        throw err
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

  function updateLocal(id: string, image?: Partial<Image>) {
    const index = images.value.findIndex((i) => i.id === id)
    if (index !== -1) images.value[index] = { ...images.value[index], ...image }
    // Active search results are separately fetched objects.
    const filteredIndex = filteredImages.value.findIndex((i) => i.id === id)
    if (filteredIndex !== -1) {
      filteredImages.value[filteredIndex] = { ...filteredImages.value[filteredIndex], ...image }
    }
  }

  function setOrder(options: ImageOrderOptions = {}) {
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
    fetchDescriptions,
    images,
    initialize,
    initialized,
    loading,
    order,
    orderBy,
    refreshImages,
    regenerateDescriptions,
    remove,
    search,
    setOrder,
    toggleHidden,
    updateDescription,
    updateLocal,
    updateMetadata,
    uploadForReview,
    visibleFilteredImages
  }
})
