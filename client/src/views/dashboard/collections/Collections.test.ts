import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { storeToRefs } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Collection } from "#src/types/models"

import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { gridCollection } from "#src/test/gridFixtures"
import Collections from "#src/views/dashboard/collections/Collections.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/stores/collections", async () => {
  const { ref } = await import("vue")
  const store = {
    bulkDownload: vi.fn<(ids: string[]) => Promise<void>>(),
    bulkRemove: vi.fn<(ids: string[]) => Promise<void>>(),
    collections: ref<Collection[]>([]),
    remove: vi.fn<(id: string) => Promise<void>>()
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
    name: "collection-new",
    path: "/dashboard/collections/new"
  },
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

const setup = async (collections: Collection[]) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/collections")
  await router.isReady()
  storeToRefs(useCollectionsStore()).collections.value = collections
  const wrapper = mount(Collections, { global: { plugins: [router], stubs: { Icon: true } } })
  await flushPromises()
  return { router, wrapper }
}

const grid = (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) =>
  wrapper.getComponent(CollectionGrid)

const select = async (
  wrapper: Awaited<ReturnType<typeof setup>>["wrapper"],
  collection: Collection,
  shiftKey = false
) => {
  grid(wrapper).vm.$emit("select", collection, new MouseEvent("click", { shiftKey }))
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
  const store = useCollectionsStore()
  storeToRefs(store).collections.value = []
  vi.mocked(store.remove).mockReset().mockResolvedValue()
  vi.mocked(store.bulkRemove).mockReset().mockResolvedValue()
  vi.mocked(store.bulkDownload).mockReset().mockResolvedValue()
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("Collections", () => {
  it("sets the header with the new-collection action and renders the grid", async () => {
    const collections = [gridCollection("a"), gridCollection("b")]
    const { wrapper } = await setup(collections)
    expect(wrapper.findComponent(CollectionGrid).exists()).toBe(true)
    expect(grid(wrapper).props("collections")).toEqual(collections)
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Collections")
    const [action] = layout.header.actions
    expect(action?.text).toBe("New Collection")
    expect(action?.icon).toBe("Plus")
    expect(action?.key).toBeUndefined()
  })

  it("renders the empty state without a grid when there are no collections", async () => {
    const { wrapper } = await setup([])
    expect(wrapper.findComponent(CollectionGrid).exists()).toBe(false)
    expect(wrapper.text()).toContain("No collections yet")
  })

  it("navigates to the new-collection route from the header action", async () => {
    const { router } = await setup([])
    const [action] = useDashboardLayout().header.actions
    action?.onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/new")
  })

  it("registers single-selection actions in order", async () => {
    const collections = [gridCollection("a")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    const layout = useDashboardLayout()
    expect(layout.selection.items).toBe(1)
    expect(layout.selection.actions.map((action) => action.key)).toEqual([
      "collection-delete-bulk",
      "collection-download",
      "collection-edit-single",
      "collection-select-images",
      "selection-cancel"
    ])
    expect(layout.selection.actions.map((action) => action.text)).toEqual([
      "Delete",
      "Download",
      "Edit",
      "Select Images",
      "Cancel"
    ])
  })

  it("drops the edit and select-images actions for a multi selection", async () => {
    const collections = [gridCollection("a"), gridCollection("b")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    await select(wrapper, collections[1])
    const layout = useDashboardLayout()
    expect(layout.selection.items).toBe(2)
    expect(layout.selection.actions.map((action) => action.key)).toEqual([
      "collection-delete-bulk",
      "collection-download",
      "selection-cancel"
    ])
  })

  it("edits and opens image selection for a single selection", async () => {
    const collections = [gridCollection("a")]
    const { router, wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    selectionAction("collection-edit-single").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/a/edit")
    selectionAction("collection-select-images").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/a/images")
  })

  it("downloads the selection through the store", async () => {
    const collections = [gridCollection("a"), gridCollection("b")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    await select(wrapper, collections[1])
    selectionAction("collection-download").onClick()
    expect(useCollectionsStore().bulkDownload).toHaveBeenCalledWith(["a", "b"])
  })

  it("deletes a bulk selection through a dialog, store call and toast", async () => {
    const collections = [gridCollection("a"), gridCollection("b")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    await select(wrapper, collections[1])
    selectionAction("collection-delete-bulk").onClick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Collections")
    expect(options.description).toBe("Delete 2 collections? This action cannot be undone.")
    expect(options.actions?.[0]?.name).toBe("Delete")
    await options.actions?.[0]?.callback?.()
    expect(useCollectionsStore().bulkRemove).toHaveBeenCalledWith(["a", "b"])
    expect(toast).toHaveBeenCalledWith({
      description: "Deleted 2 collections.",
      title: "Collections Deleted",
      type: "success"
    })
    expect(useDashboardLayout().selection.items).toBe(0)
  })

  it("deletes a single collection from the grid through a dialog", async () => {
    const collections = [gridCollection("a")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    grid(wrapper).vm.$emit("delete", collections[0])
    await nextTick()
    const options = deleteOptions()
    expect(options.title).toBe("Delete Collection")
    expect(options.description).toBe("This action cannot be undone.")
    await options.actions?.[0]?.callback?.()
    expect(useCollectionsStore().remove).toHaveBeenCalledWith("a")
    expect(toast).toHaveBeenCalledWith({
      description: "Collection deleted.",
      title: "Collection Deleted",
      type: "success"
    })
    expect(useDashboardLayout().selection.items).toBe(0)
  })

  it("edits and deletes through the grid action events", async () => {
    const collections = [gridCollection("a")]
    const { router, wrapper } = await setup(collections)
    grid(wrapper).vm.$emit("edit", collections[0])
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/a/edit")
    grid(wrapper).vm.$emit("delete", collections[0])
    await nextTick()
    await deleteOptions().actions?.[0]?.callback?.()
    expect(useCollectionsStore().remove).toHaveBeenCalledWith("a")
  })

  it("selects a range with shift and deselects on a repeat click", async () => {
    const collections = [gridCollection("a"), gridCollection("b"), gridCollection("c")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    await select(wrapper, collections[2], true)
    expect(useDashboardLayout().selection.items).toBe(3)
    await select(wrapper, collections[0])
    expect(useDashboardLayout().selection.items).toBe(2)
  })

  it("clears the selection from the cancel action", async () => {
    const collections = [gridCollection("a")]
    const { wrapper } = await setup(collections)
    await select(wrapper, collections[0])
    selectionAction("selection-cancel").onClick()
    await nextTick()
    expect(useDashboardLayout().selection.items).toBe(0)
    expect(useDashboardLayout().selection.actions.length).toBe(3)
    expect(grid(wrapper).props("selectedCollectionsIds")).toEqual([])
  })
})
