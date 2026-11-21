import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { storeToRefs } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Image } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { gridImage } from "#src/test/gridFixtures"
import Images from "#src/views/dashboard/images/Images.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/stores/images", async () => {
  const { ref } = await import("vue")
  const store = {
    bulkDownload: vi.fn<(ids: string[]) => Promise<void>>(),
    bulkRemove: vi.fn<(ids: string[]) => Promise<void>>(),
    bulkToggleHidden: vi.fn<(ids: string[], hidden: boolean) => Promise<Image[]>>(),
    images: ref<Image[]>([]),
    remove: vi.fn<(id: string) => Promise<void>>()
  }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "images-list", path: "/dashboard/images" },
  { component: { template: "<div />" }, name: "images-edit", path: "/dashboard/images/edit" },
  { component: { template: "<div />" }, name: "image-edit", path: "/dashboard/images/:id/edit" },
  { component: { template: "<div />" }, name: "image-upload", path: "/dashboard/images/upload" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const setup = async (images: Image[]) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/images")
  await router.isReady()
  storeToRefs(useImagesStore()).images.value = images
  const wrapper = mount(Images, { global: { plugins: [router], stubs: { Icon: true } } })
  await flushPromises()
  return { router, wrapper }
}

const grid = (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) =>
  wrapper.getComponent(ImageGrid)

const select = async (
  wrapper: Awaited<ReturnType<typeof setup>>["wrapper"],
  image: Image,
  shiftKey = false
) => {
  grid(wrapper).vm.$emit("select", image, new MouseEvent("click", { shiftKey }))
  await nextTick()
}

const selectionAction = (key: string) => {
  const action = useDashboardLayout().selection.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing selection action ${key}`)
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
  storeToRefs(store).images.value = []
  vi.mocked(store.remove).mockReset()
  vi.mocked(store.bulkRemove).mockReset()
  vi.mocked(store.bulkDownload).mockReset()
  vi.mocked(store.bulkToggleHidden).mockReset()
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("Images", () => {
  it("sets the header with the upload action and renders the empty state", async () => {
    const { router, wrapper } = await setup([])
    expect(wrapper.text()).toContain("No images yet")
    expect(wrapper.findComponent(ImageGrid).exists()).toBe(false)
    expect(useDashboardLayout().header.title).toBe("Images")
    const [action] = useDashboardLayout().header.actions
    expect(action?.text).toBe("Upload")
    expect(action?.icon).toBe("Upload")
    expect(action?.key).toBeUndefined()
    action?.onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/upload")
  })

  it("passes the store images to the grid", async () => {
    const images = [gridImage("a"), gridImage("b")]
    const { wrapper } = await setup(images)
    expect(grid(wrapper).props("images")).toEqual(images)
    expect(grid(wrapper).props("selectedImagesIds")).toEqual([])
  })

  it("registers single-selection actions and hides through the store", async () => {
    const images = [gridImage("a")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    const layout = useDashboardLayout()
    expect(layout.selection.items).toBe(1)
    expect(layout.selection.actions.map((action) => action.key)).toEqual([
      "image-delete-bulk",
      "image-download",
      "image-hide",
      "image-edit-single",
      "selection-cancel"
    ])
    expect(layout.selection.actions.map((action) => action.text)).toEqual([
      "Delete",
      "Download",
      "Hide",
      "Edit",
      "Cancel"
    ])
    selectionAction("image-hide").onClick()
    expect(useImagesStore().bulkToggleHidden).toHaveBeenCalledWith(["a"], true)
  })

  it("flips the toggle action to Show when every selected image is hidden", async () => {
    const images = [gridImage("a", true), gridImage("b", true)]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    await select(wrapper, images[1])
    const layout = useDashboardLayout()
    expect(layout.selection.items).toBe(2)
    const show = selectionAction("image-show")
    expect(show.text).toBe("Show")
    expect(show.icon).toBe("Eye")
    show.onClick()
    expect(useImagesStore().bulkToggleHidden).toHaveBeenCalledWith(["a", "b"], false)
  })

  it("keeps Hide for a mixed selection", async () => {
    const images = [gridImage("a", true), gridImage("b")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    await select(wrapper, images[1])
    expect(selectionAction("image-hide").text).toBe("Hide")
  })

  it("downloads the selection through the store", async () => {
    const images = [gridImage("a"), gridImage("b")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    await select(wrapper, images[1])
    selectionAction("image-download").onClick()
    expect(useImagesStore().bulkDownload).toHaveBeenCalledWith(["a", "b"])
  })

  it("edits a single image and bulk edits several", async () => {
    const images = [gridImage("a"), gridImage("b")]
    const { router, wrapper } = await setup(images)
    await select(wrapper, images[0])
    selectionAction("image-edit-single").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/a/edit")
    await select(wrapper, images[1])
    selectionAction("image-edit-bulk").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/edit")
    expect(router.currentRoute.value.query.ids).toBe("a,b")
  })

  it("selects a range with shift and deselects on a repeat click", async () => {
    const images = [gridImage("a"), gridImage("b"), gridImage("c")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    await select(wrapper, images[2], true)
    expect(useDashboardLayout().selection.items).toBe(3)
    await select(wrapper, images[0])
    expect(useDashboardLayout().selection.items).toBe(2)
  })

  it("deletes a bulk selection through a dialog, store call and toast", async () => {
    const images = [gridImage("a"), gridImage("b")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    await select(wrapper, images[1])
    selectionAction("image-delete-bulk").onClick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Images")
    expect(options.description).toBe("Delete 2 images? This action cannot be undone.")
    expect(options.actions?.[0]?.name).toBe("Delete")
    await options.actions?.[0]?.callback?.()
    expect(useImagesStore().bulkRemove).toHaveBeenCalledWith(["a", "b"])
    expect(toast).toHaveBeenCalledWith({
      description: "Deleted 2 images.",
      title: "Images Deleted",
      type: "success"
    })
    expect(useDashboardLayout().selection.items).toBe(0)
  })

  it("deletes a single image from the grid through a dialog", async () => {
    const images = [gridImage("a")]
    const { wrapper } = await setup(images)
    grid(wrapper).vm.$emit("delete", images[0])
    await nextTick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Image")
    expect(options.description).toBe("This action cannot be undone.")
    await options.actions?.[0]?.callback?.()
    expect(useImagesStore().remove).toHaveBeenCalledWith("a")
    expect(toast).toHaveBeenCalledWith({
      description: "Image deleted.",
      title: "Image Deleted",
      type: "success"
    })
  })

  it("clears the selection from the cancel action", async () => {
    const images = [gridImage("a")]
    const { wrapper } = await setup(images)
    await select(wrapper, images[0])
    selectionAction("selection-cancel").onClick()
    await nextTick()
    expect(useDashboardLayout().selection.items).toBe(0)
    expect(useDashboardLayout().selection.actions.length).toBe(5)
    expect(grid(wrapper).props("selectedImagesIds")).toEqual([])
  })
})
