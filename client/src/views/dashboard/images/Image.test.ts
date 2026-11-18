import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Image as ImageModel } from "#src/types/models"

import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { gridImage } from "#src/test/gridFixtures"
import Image from "#src/views/dashboard/images/Image.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/stores/images", () => {
  const store = {
    download: vi.fn<(id: string) => Promise<void>>(),
    fetch: vi.fn<(id: string) => Promise<ImageModel>>(),
    remove: vi.fn<(id: string) => Promise<void>>(),
    toggleHidden: vi.fn<(id: string, hidden: boolean) => Promise<ImageModel>>()
  }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "images-list", path: "/dashboard/images" },
  { component: { template: "<div />" }, name: "image-edit", path: "/dashboard/images/:id/edit" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const image: ImageModel = { ...gridImage("img-1"), camera: "Canon" }

const setup = async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/images/img-1")
  await router.isReady()
  const wrapper = mount(Image, {
    global: { plugins: [router], stubs: { Icon: true, ImageMetadata: true } },
    props: { id: "img-1" }
  })
  await flushPromises()
  return { router, wrapper }
}

const headerAction = (key: string) => {
  const action = useDashboardLayout().header.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing header action ${key}`)
  return action
}

const deleteOptions = () => {
  const options = dialog.show.mock.lastCall?.[0]
  if (!options) throw new Error("No dialog shown")
  return options
}

beforeEach(() => {
  useDashboardLayout().reset()
  toast.mockReset()
  dialog.show.mockClear()
  const store = useImagesStore()
  vi.mocked(store.fetch).mockReset().mockResolvedValue(image)
  vi.mocked(store.remove).mockReset().mockResolvedValue()
  vi.mocked(store.toggleHidden)
    .mockReset()
    .mockResolvedValue({ ...image, hidden: true })
  vi.mocked(store.download).mockReset().mockResolvedValue()
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("Image", () => {
  it("loads the image once and registers the header actions", async () => {
    const { wrapper } = await setup()
    expect(useImagesStore().fetch).toHaveBeenCalledOnce()
    expect(useImagesStore().fetch).toHaveBeenCalledWith("img-1")
    expect(wrapper.get("img").attributes("src")).toBeUndefined()
    expect(wrapper.get("img").attributes("title")).toBe("Description img-1")
    expect(wrapper.get("img").attributes("alt")).toBe("Description img-1")
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Image")
    expect(layout.header.actions.map((action) => action.key)).toEqual([
      "toggle-hidden",
      "download",
      "edit",
      "delete"
    ])
    expect(layout.header.actions.map((action) => action.text)).toEqual([
      "Hide",
      "Download",
      "Edit",
      "Delete"
    ])
  })

  it("renders the metadata panel when the image has metadata", async () => {
    const { wrapper } = await setup()
    const metadata = wrapper.getComponent(ImageMetadata)
    expect(metadata.props("image")).toEqual(image)
  })

  it("toggles the hidden state and flips the action label", async () => {
    await setup()
    expect(headerAction("toggle-hidden").text).toBe("Hide")
    headerAction("toggle-hidden").onClick()
    await flushPromises()
    expect(useImagesStore().toggleHidden).toHaveBeenCalledWith("img-1", true)
    const toggled = headerAction("toggle-hidden")
    expect(toggled.text).toBe("Show")
    expect(toggled.icon).toBe("Eye")
    expect(useDashboardLayout().header.title).toBe("Image")
  })

  it("navigates to the editor and downloads through the store", async () => {
    const { router } = await setup()
    headerAction("edit").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/img-1/edit")
    headerAction("download").onClick()
    expect(useImagesStore().download).toHaveBeenCalledWith("img-1")
  })

  it("deletes through a dialog and navigates back with a success toast", async () => {
    const { router } = await setup()
    headerAction("delete").onClick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Image")
    expect(options.description).toBe("Are you sure you want to delete this image?")
    await options.actions?.[0]?.callback?.()
    await flushPromises()
    expect(useImagesStore().remove).toHaveBeenCalledWith("img-1")
    expect(toast).toHaveBeenCalledWith({
      description: "The image has been deleted successfully.",
      title: "Image Deleted",
      type: "success"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
  })

  it("toasts the failure when the delete fails", async () => {
    const { router } = await setup()
    vi.mocked(useImagesStore().remove).mockRejectedValue(new Error("boom"))
    headerAction("delete").onClick()
    await deleteOptions().actions?.[0]?.callback?.()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Delete Failed",
      type: "error"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/img-1")
  })
})
