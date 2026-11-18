import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, nextTick, ref } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { UploadConfirmation } from "#src/stores/images"
import type { UploadedImage, UploadReview } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { uploadedGridImage } from "#src/test/gridFixtures"
import UploadImages from "#src/views/dashboard/images/UploadImages.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/stores/images", () => {
  const store = {
    confirmUpload: vi.fn<(images: UploadConfirmation[]) => Promise<UploadedImage[]>>(),
    uploadForReview: vi.fn<(images: File[]) => Promise<UploadReview[]>>()
  }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())

const UploaderStub = defineComponent({
  emits: ["upload"],
  setup(_, { expose }) {
    const hasSelectedImages = ref(false)
    const hasExceededFileLimit = ref(false)
    const canAddMoreFiles = ref(true)
    const handleResetSelection = vi.fn()
    const handleSelectImages = vi.fn()
    const handleUploadImages = vi.fn()
    expose({
      canAddMoreFiles,
      handleResetSelection,
      handleSelectImages,
      handleUploadImages,
      hasExceededFileLimit,
      hasSelectedImages
    })
    return {
      canAddMoreFiles,
      handleResetSelection,
      handleSelectImages,
      handleUploadImages,
      hasExceededFileLimit,
      hasSelectedImages
    }
  },
  template: "<div />"
})

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "images-list", path: "/dashboard/images" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const uploadPayload = {
  images: [new File([new Uint8Array(4)], "photo.jpg")],
  previewUrls: ["blob:1"]
}

const setup = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/images/upload")
  await router.isReady()
  const wrapper = mount(UploadImages, {
    global: {
      plugins: [router],
      stubs: { Icon: true, ImageGrid: true, ImageUploader: UploaderStub, MetadataEditor: true }
    }
  })
  await flushPromises()
  return { router, wrapper }
}

const uploader = (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) =>
  wrapper.getComponent(UploaderStub)

const headerAction = (key: string) => {
  const action = useDashboardLayout().header.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing header action ${key}`)
  return action
}

const footerAction = (key: string) => {
  const action = useDashboardLayout().footer.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing footer action ${key}`)
  return action
}

const review = (sessionId: string, metadata: Partial<{ camera: string }>): UploadReview => ({
  filePath: `${sessionId}.jpg`,
  metadata,
  sessionId
})

const startReview = async (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"], count = 1) => {
  vi.mocked(useImagesStore().uploadForReview).mockResolvedValue(
    Array.from({ length: count }, (_, index) => review(`s${index + 1}`, { camera: "Canon" }))
  )
  uploader(wrapper).vm.$emit("upload", {
    images: Array.from({ length: count }, () => new File([new Uint8Array(4)], "photo.jpg")),
    previewUrls: Array.from({ length: count }, (_, index) => `blob:${index + 1}`)
  })
  await flushPromises()
}

beforeEach(() => {
  useDashboardLayout().reset()
  toast.mockReset()
  const store = useImagesStore()
  vi.mocked(store.uploadForReview).mockReset().mockResolvedValue([])
  vi.mocked(store.confirmUpload).mockReset().mockResolvedValue([uploadedGridImage()])
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("UploadImages", () => {
  it("shows the select layout without a footer on step 1", async () => {
    await setup()
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Upload Images")
    expect(layout.header.actions.map((action) => action.key)).toEqual(["select-images"])
    expect(layout.header.actions[0]?.text).toBe("Select Images")
    expect(layout.header.actions[0]?.disabled).toBe(false)
    expect(layout.footer.actions).toEqual([])
  })

  it("switches to the add-more layout with footer actions once files are selected", async () => {
    const { wrapper } = await setup()
    uploader(wrapper).vm.hasSelectedImages = true
    await nextTick()
    const layout = useDashboardLayout()
    expect(layout.header.actions.map((action) => action.key)).toEqual(["add-more"])
    expect(layout.header.actions[0]?.text).toBe("Add More")
    expect(layout.footer.actions.map((action) => action.key)).toEqual([
      "cancel-upload",
      "continue-upload"
    ])
    expect(footerAction("continue-upload").text).toBe("Continue")
    footerAction("continue-upload").onClick()
    expect(uploader(wrapper).vm.handleUploadImages).toHaveBeenCalledOnce()
    footerAction("cancel-upload").onClick()
    expect(uploader(wrapper).vm.handleResetSelection).toHaveBeenCalledOnce()
    uploader(wrapper).vm.hasSelectedImages = false
    await nextTick()
    expect(useDashboardLayout().footer.actions).toEqual([])
  })

  it("disables add-more when the file limit is reached", async () => {
    const { wrapper } = await setup()
    uploader(wrapper).vm.hasSelectedImages = true
    uploader(wrapper).vm.canAddMoreFiles = false
    await nextTick()
    expect(headerAction("add-more").disabled).toBe(true)
    uploader(wrapper).vm.hasExceededFileLimit = true
    await nextTick()
    expect(footerAction("continue-upload").disabled).toBe(true)
  })

  it("invokes the uploader selection from the header action", async () => {
    const { wrapper } = await setup()
    headerAction("select-images").onClick()
    expect(uploader(wrapper).vm.handleSelectImages).toHaveBeenCalledOnce()
  })

  it("shows the extracting state while the review upload is pending", async () => {
    const { wrapper } = await setup()
    vi.mocked(useImagesStore().uploadForReview).mockImplementation(() => new Promise(() => {}))
    uploader(wrapper).vm.$emit("upload", uploadPayload)
    await nextTick()
    expect(wrapper.find(".loading-title").text()).toBe("Extracting metadata...")
  })

  it("moves to the review step with the uploaded count and editor", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper)
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Review Images (1)")
    expect(layout.header.actions).toEqual([])
    expect(layout.footer.actions.map((action) => action.key)).toEqual(["cancel", "confirm"])
    expect(footerAction("confirm").text).toBe("Confirm")
    expect(footerAction("cancel").text).toBe("Cancel")
    const editor = wrapper.getComponent(MetadataEditor)
    expect(editor.props("initialMetadata")).toEqual({ camera: "Canon" })
    expect(editor.props("previewUrl")).toBe("blob:1")
    expect(editor.props("previewFilename")).toBe("photo.jpg")
    expect(wrapper.findAll(".image-list-item")).toHaveLength(1)
  })

  it("pairs session ids with edited metadata in the confirm payload", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper, 2)
    expect(useDashboardLayout().header.title).toBe("Review Images (2)")
    wrapper.getComponent(MetadataEditor).vm.$emit("update", {
      aperture: "",
      camera: "Nikon",
      comment: "",
      date: "",
      focalLength: "",
      focalLengthEquivalent: "",
      iso: "",
      lens: "",
      shutterSpeed: ""
    })
    await nextTick()
    footerAction("confirm").onClick()
    await flushPromises()
    expect(useImagesStore().confirmUpload).toHaveBeenCalledOnce()
    expect(useImagesStore().confirmUpload).toHaveBeenCalledWith([
      {
        metadata: {
          aperture: "",
          camera: "Nikon",
          comment: "",
          date: "",
          focalLength: "",
          focalLengthEquivalent: "",
          iso: "",
          lens: "",
          shutterSpeed: ""
        },
        sessionId: "s1"
      },
      { metadata: { camera: "Canon" }, sessionId: "s2" }
    ])
  })

  it("shows the complete step after confirming and navigates from all-images", async () => {
    const { router, wrapper } = await setup()
    await startReview(wrapper)
    footerAction("confirm").onClick()
    await flushPromises()
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Upload Complete")
    expect(layout.header.actions.map((action) => action.key)).toEqual(["view-all", "upload-more"])
    expect(layout.footer.actions).toEqual([])
    expect(wrapper.getComponent(ImageGrid).props("images")).toEqual([uploadedGridImage()])
    headerAction("view-all").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
  })

  it("toasts the failure when the review upload fails", async () => {
    const { wrapper } = await setup()
    vi.mocked(useImagesStore().uploadForReview).mockRejectedValue(new Error("boom"))
    uploader(wrapper).vm.$emit("upload", uploadPayload)
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Error Uploading Images",
      type: "error"
    })
    expect(useDashboardLayout().header.title).toBe("Upload Images")
  })

  it("toasts the failure when the confirm fails and keeps the review layout", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper)
    vi.mocked(useImagesStore().confirmUpload).mockRejectedValue(new Error("boom"))
    footerAction("confirm").onClick()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Error Confirming Upload",
      type: "error"
    })
    expect(useDashboardLayout().header.title).toBe("Review Images (0)")
  })

  it("removes a reviewed image and keeps the review count in sync", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper, 2)
    await wrapper.findAll(".remove-button")[0]?.trigger("click")
    await nextTick()
    expect(useDashboardLayout().header.title).toBe("Review Images (1)")
    expect(wrapper.getComponent(MetadataEditor).props("previewUrl")).toBe("blob:2")
    expect(wrapper.getComponent(MetadataEditor).props("previewFilename")).toBe("photo.jpg")
  })

  it("cancels back to the select layout when the last image is removed", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper)
    await wrapper.get(".remove-button").trigger("click")
    await flushPromises()
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Upload Images")
    expect(layout.header.actions.map((action) => action.key)).toEqual(["select-images"])
    expect(layout.footer.actions).toEqual([])
  })

  it("resets through cancel and re-opens the uploader from upload-more", async () => {
    const { wrapper } = await setup()
    await startReview(wrapper)
    footerAction("cancel").onClick()
    await flushPromises()
    expect(useDashboardLayout().header.title).toBe("Upload Images")
    await startReview(wrapper)
    footerAction("confirm").onClick()
    await flushPromises()
    headerAction("upload-more").onClick()
    await flushPromises()
    expect(useDashboardLayout().header.title).toBe("Upload Images")
    expect(uploader(wrapper).vm.handleSelectImages).toHaveBeenCalledOnce()
  })
})
