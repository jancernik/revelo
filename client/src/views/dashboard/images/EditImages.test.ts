import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { storeToRefs } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Image } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { gridImage } from "#src/test/gridFixtures"
import EditImages from "#src/views/dashboard/images/EditImages.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/stores/images", async () => {
  const { ref } = await import("vue")
  const store = {
    bulkUpdateMetadata: vi.fn<(ids: (null | string)[], metadata: unknown) => Promise<Image[]>>(),
    images: ref<Image[]>([])
  }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "images-list", path: "/dashboard/images" },
  { component: { template: "<div />" }, name: "image-edit", path: "/dashboard/images/:id/edit" },
  { component: { template: "<div />" }, name: "images-edit", path: "/dashboard/images/edit" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const images = [gridImage("a"), gridImage("b"), gridImage("c")]

const setup = async (ids?: string) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(ids ? `/dashboard/images/edit?ids=${ids}` : "/dashboard/images/edit")
  await router.isReady()
  storeToRefs(useImagesStore()).images.value = images
  const wrapper = mount(EditImages, {
    global: { plugins: [router], stubs: { Icon: true, ImageGrid: true, MetadataEditor: true } }
  })
  await flushPromises()
  return { router, wrapper }
}

const footerAction = (key: string) => {
  const action = useDashboardLayout().footer.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing footer action ${key}`)
  return action
}

beforeEach(() => {
  useDashboardLayout().reset()
  toast.mockReset()
  dialog.show.mockClear()
  const store = useImagesStore()
  storeToRefs(store).images.value = []
  vi.mocked(store.bulkUpdateMetadata).mockReset().mockResolvedValue(images)
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("EditImages", () => {
  it("redirects to the images list when there are no ids", async () => {
    const { router, wrapper } = await setup()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
    expect(wrapper.findComponent(ImageGrid).props("images")).toEqual([])
  })

  it("redirects to the single-image editor for one id", async () => {
    const { router } = await setup("a")
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/a/edit")
  })

  it("shows the plural title, the filtered grid and a disabled save", async () => {
    const { wrapper } = await setup("a,c")
    const grid = wrapper.getComponent(ImageGrid)
    expect(grid.props("images")).toEqual([images[0], images[2]])
    expect(grid.props("allowSelect")).toBe(false)
    expect(wrapper.find(".hint").text()).toBe(
      "Only filled fields will be applied to all selected images."
    )
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Edit 2 Images")
    expect(layout.footer.actions.map((action) => action.key)).toEqual(["cancel", "save"])
    expect(footerAction("save").disabled).toBe(true)
    const editor = wrapper.getComponent(MetadataEditor)
    expect(editor.props("initialMetadata")).toEqual({
      aperture: "",
      camera: "",
      comment: "",
      date: "",
      focalLength: "",
      focalLengthEquivalent: "",
      iso: "",
      lens: "",
      shutterSpeed: ""
    })
    expect(editor.props("previewUrl")).toBe("")
    expect(editor.props("showPreview")).toBe(false)
  })

  it("accepts repeated query ids without combining or losing them", async () => {
    const { wrapper } = await setup("a&ids=c")
    expect(wrapper.getComponent(ImageGrid).props("images")).toEqual([images[0], images[2]])
    wrapper.getComponent(MetadataEditor).vm.$emit("update", { camera: "Nikon" })
    await nextTick()
    await footerAction("save").onClick()
    expect(useImagesStore().bulkUpdateMetadata).toHaveBeenCalledWith(["a", "c"], {
      camera: "Nikon"
    })
  })

  it("preserves null query entries so malformed targets fail without updating a subset", async () => {
    const { router, wrapper } = await setup("a&ids=b&ids")
    vi.mocked(useImagesStore().bulkUpdateMetadata).mockRejectedValue(new Error("Invalid ids"))
    expect(useDashboardLayout().header.title).toBe("Edit 3 Images")
    wrapper.getComponent(MetadataEditor).vm.$emit("update", { camera: "Nikon" })
    await nextTick()
    await footerAction("save").onClick()
    expect(useImagesStore().bulkUpdateMetadata).toHaveBeenCalledWith(["a", "b", null], {
      camera: "Nikon"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/edit")
    expect(toast).toHaveBeenCalledWith({
      description: "Invalid ids",
      title: "Update Failed",
      type: "error"
    })
    expect(footerAction("save").disabled).toBe(false)
  })

  it("keeps save disabled when only empty fields are set", async () => {
    const { wrapper } = await setup("a,c")
    wrapper.getComponent(MetadataEditor).vm.$emit("update", {
      aperture: "",
      camera: "",
      comment: "",
      date: "",
      focalLength: "",
      focalLengthEquivalent: "",
      iso: "",
      lens: "",
      shutterSpeed: ""
    })
    await nextTick()
    expect(footerAction("save").disabled).toBe(true)
    expect(useImagesStore().bulkUpdateMetadata).not.toHaveBeenCalled()
  })

  it("applies only the filled fields to all selected images", async () => {
    const { router, wrapper } = await setup("a,c")
    wrapper.getComponent(MetadataEditor).vm.$emit("update", {
      aperture: "f/2",
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
    expect(footerAction("save").disabled).toBe(false)
    footerAction("save").onClick()
    await flushPromises()
    expect(useImagesStore().bulkUpdateMetadata).toHaveBeenCalledOnce()
    expect(useImagesStore().bulkUpdateMetadata).toHaveBeenCalledWith(["a", "c"], {
      aperture: "f/2",
      camera: "Nikon"
    })
    expect(toast).toHaveBeenCalledWith({
      description: "Updated metadata for 2 images.",
      title: "Images Updated",
      type: "success"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
  })

  it("toasts the failure when the bulk save fails", async () => {
    const { router, wrapper } = await setup("a,c")
    vi.mocked(useImagesStore().bulkUpdateMetadata).mockRejectedValue(new Error("boom"))
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
    footerAction("save").onClick()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Update Failed",
      type: "error"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/edit")
  })

  it("returns to the images list from cancel", async () => {
    const { router } = await setup("a,c")
    footerAction("cancel").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images")
    expect(useImagesStore().bulkUpdateMetadata).not.toHaveBeenCalled()
  })
})
