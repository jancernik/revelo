import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Collection as CollectionModel } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { gridCollection } from "#src/test/gridFixtures"
import Collection from "#src/views/dashboard/collections/Collection.vue"

const sortable = vi.hoisted(() => ({
  cleanup: vi.fn(),
  init: vi.fn<
    (container: HTMLElement, images: unknown[], reorder: (images: unknown[]) => void) => void
  >(),
  push: vi.fn()
}))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/composables/useSortableGrid", () => ({ useSortableGrid: () => sortable }))
vi.mock("#src/stores/collections", () => {
  const collections: CollectionModel[] = []
  const store = {
    collections,
    download: vi.fn<(id: string) => Promise<void>>(),
    fetch: vi.fn<(id: string) => Promise<CollectionModel>>(),
    remove: vi.fn<(id: string) => Promise<void>>(),
    removeImages: vi.fn<(id: string, imageIds: string[]) => Promise<void>>(),
    setImages: vi.fn<(id: string, imageIds: string[]) => Promise<void>>()
  }
  return { useCollectionsStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "collections-list", path: "/dashboard/collections" },
  {
    component: { template: "<div />" },
    name: "collection-edit",
    path: "/dashboard/collections/:id/edit"
  },
  {
    component: { template: "<div />" },
    name: "collection-view",
    path: "/dashboard/collections/:id"
  },
  {
    component: { template: "<div />" },
    name: "collection-images",
    path: "/dashboard/collections/:id/images"
  },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const collection: CollectionModel = gridCollection("c1", 2)

const setup = async (fetched: CollectionModel = collection) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/collections/c1")
  await router.isReady()
  const store = useCollectionsStore()
  store.collections = [fetched]
  vi.mocked(store.fetch).mockResolvedValue(fetched)
  const wrapper = mount(Collection, {
    global: { plugins: [router], stubs: { Icon: true } },
    props: { id: "c1" }
  })
  await flushPromises()
  return { router, wrapper }
}

const grid = (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) =>
  wrapper.getComponent(ImageGrid)

const select = async (
  wrapper: Awaited<ReturnType<typeof setup>>["wrapper"],
  imageId: string,
  shiftKey = false
) => {
  const images = grid(wrapper).props("images")
  const image = images.find((item) => item.id === imageId)
  if (!image) throw new Error(`Missing image ${imageId}`)
  grid(wrapper).vm.$emit("select", image, new MouseEvent("click", { shiftKey }))
  await nextTick()
}

const headerAction = (key: string) => {
  const action = useDashboardLayout().header.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing header action ${key}`)
  return action
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
  sortable.init.mockClear()
  sortable.cleanup.mockClear()
  const store = useCollectionsStore()
  store.collections = []
  vi.mocked(store.fetch).mockReset().mockResolvedValue(collection)
  vi.mocked(store.remove).mockReset().mockResolvedValue()
  vi.mocked(store.setImages).mockReset().mockResolvedValue(null)
  vi.mocked(store.removeImages).mockReset().mockResolvedValue(null)
  vi.mocked(store.download).mockReset().mockResolvedValue()
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("Collection", () => {
  it("loads the collection once and registers the header actions", async () => {
    const { wrapper } = await setup()
    expect(useCollectionsStore().fetch).toHaveBeenCalledOnce()
    expect(useCollectionsStore().fetch).toHaveBeenCalledWith("c1")
    expect(grid(wrapper).props("images")).toEqual(collection.images)
    expect(grid(wrapper).props("selectedImagesIds")).toEqual([])
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Title c1")
    expect(layout.header.actions.map((action) => action.key)).toEqual([
      "edit",
      "download",
      "reorder",
      "select-images",
      "delete"
    ])
    expect(layout.header.actions.map((action) => action.text)).toEqual([
      "Edit",
      "Download",
      "Reorder",
      "Select Images",
      "Delete"
    ])
  })

  it("navigates to edit and image selection and downloads through the store", async () => {
    const { router } = await setup()
    headerAction("edit").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1/edit")
    headerAction("select-images").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1/images")
    headerAction("download").onClick()
    expect(useCollectionsStore().download).toHaveBeenCalledWith("c1")
  })

  it("swaps the header actions in reorder mode and restores them on cancel", async () => {
    const { wrapper } = await setup()
    headerAction("reorder").onClick()
    await nextTick()
    const layout = useDashboardLayout()
    expect(layout.header.actions.map((action) => action.key)).toEqual([
      "save-order",
      "cancel-reorder"
    ])
    expect(layout.header.actions.map((action) => action.text)).toEqual(["Save Order", "Cancel"])
    expect(grid(wrapper).props("allowReorder")).toBe(true)
    expect(grid(wrapper).props("allowSelect")).toBe(false)
    headerAction("cancel-reorder").onClick()
    await nextTick()
    expect(useDashboardLayout().header.actions.map((action) => action.key)).toEqual([
      "edit",
      "download",
      "reorder",
      "select-images",
      "delete"
    ])
  })

  it("saves a reordered selection through setImages and refreshes the local collection", async () => {
    const { wrapper } = await setup()
    headerAction("reorder").onClick()
    await nextTick()
    const reordered = [collection.images[1], collection.images[0]]
    grid(wrapper).vm.$emit("reorder", reordered)
    await nextTick()
    const store = useCollectionsStore()
    vi.mocked(store.setImages).mockImplementation(async (_id, imageIds) => {
      const rebuilt = {
        ...collection,
        images: imageIds.flatMap((id) => collection.images.filter((i) => i.id === id))
      }
      store.collections = [rebuilt]
      return rebuilt
    })
    headerAction("save-order").onClick()
    await flushPromises()
    expect(store.setImages).toHaveBeenCalledWith("c1", ["c1-1", "c1-0"])
    expect(grid(wrapper).props("images")).toEqual(reordered)
    expect(toast).toHaveBeenCalledWith({
      description: "Image order saved.",
      title: "Order Saved",
      type: "success"
    })
    expect(useDashboardLayout().header.actions.map((action) => action.key)).toEqual([
      "edit",
      "download",
      "reorder",
      "select-images",
      "delete"
    ])
  })

  it("deletes the collection through a dialog and navigates back with a success toast", async () => {
    const { router } = await setup()
    headerAction("delete").onClick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Collection")
    expect(options.description).toBe('Are you sure you want to delete the collection "Title c1"?')
    await options.actions?.[0]?.callback?.()
    await flushPromises()
    expect(useCollectionsStore().remove).toHaveBeenCalledWith("c1")
    expect(toast).toHaveBeenCalledWith({
      description: "The collection has been deleted successfully.",
      title: "Collection Deleted",
      type: "success"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/collections")
  })

  it("toasts the failure when the delete fails", async () => {
    const { router } = await setup()
    vi.mocked(useCollectionsStore().remove).mockRejectedValue(new Error("boom"))
    headerAction("delete").onClick()
    await deleteOptions().actions?.[0]?.callback?.()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Delete Failed",
      type: "error"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1")
  })

  it("removes selected images from the collection and clears the selection", async () => {
    const { wrapper } = await setup()
    await select(wrapper, "c1-0")
    const layout = useDashboardLayout()
    expect(layout.selection.items).toBe(1)
    expect(layout.selection.actions.map((action) => action.key)).toEqual([
      "selection-remove",
      "selection-cancel"
    ])
    expect(layout.selection.actions.map((action) => action.text)).toEqual([
      "Remove from collection",
      "Cancel"
    ])
    const store = useCollectionsStore()
    vi.mocked(store.removeImages).mockImplementation(async (_id, imageIds) => {
      const rebuilt = {
        ...collection,
        images: collection.images.filter((i) => !imageIds.includes(i.id))
      }
      store.collections = [rebuilt]
      return rebuilt
    })
    selectionAction("selection-remove").onClick()
    await flushPromises()
    expect(store.removeImages).toHaveBeenCalledWith("c1", ["c1-0"])
    expect(grid(wrapper).props("images")).toEqual([collection.images[1]])
    expect(useDashboardLayout().selection.items).toBe(0)
  })

  it("renders the empty state when the collection has no images", async () => {
    const { wrapper } = await setup({ ...gridCollection("c1", 0), description: null })
    expect(wrapper.findComponent(ImageGrid).exists()).toBe(false)
    expect(wrapper.text()).toContain("No Images in this collection yet")
  })

  it("selects a range with shift and deselects on a repeat click", async () => {
    const { wrapper } = await setup()
    await select(wrapper, "c1-0")
    await select(wrapper, "c1-1", true)
    expect(useDashboardLayout().selection.items).toBe(2)
    await select(wrapper, "c1-0")
    expect(useDashboardLayout().selection.items).toBe(1)
  })
})
