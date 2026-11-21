import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { storeToRefs } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Collection, Image } from "#src/types/models"

import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { gridCollection, gridImage } from "#src/test/gridFixtures"
import Index from "#src/views/dashboard/Index.vue"

const controls = vi.hoisted(() => {
  vi.stubEnv("VITE_COMMIT_HASH", "")
  return { dialog: vi.fn<(options: DialogOptions) => void>(), toast: vi.fn() }
})
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: controls.dialog }) }))
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: controls.toast }) }))
vi.mock("#src/stores/images", async () => {
  const { ref } = await import("vue")
  const images = {
    bulkDownload: vi.fn<(ids: string[]) => Promise<void>>(),
    bulkRemove: vi.fn<(ids: string[]) => Promise<void>>(),
    images: ref<Image[]>([]),
    remove: vi.fn<(id: string) => Promise<void>>()
  }
  return { useImagesStore: () => images }
})
vi.mock("#src/stores/collections", async () => {
  const { ref } = await import("vue")
  const collections = {
    bulkDownload: vi.fn<(ids: string[]) => Promise<void>>(),
    bulkRemove: vi.fn<(ids: string[]) => Promise<void>>(),
    collections: ref<Collection[]>([]),
    remove: vi.fn<(id: string) => Promise<void>>()
  }
  return { useCollectionsStore: () => collections }
})

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  useDashboardLayout().reset()
})
afterEach(() => vi.unstubAllEnvs())

const setup = async () => {
  const images = [gridImage("a"), { ...gridImage("b"), collectionId: "c" }, gridImage("d")]
  const collections = [gridCollection("c"), gridCollection("e")]
  storeToRefs(useImagesStore()).images.value = images
  storeToRefs(useCollectionsStore()).collections.value = collections
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { component: { template: "<div />" }, name: "images-edit", path: "/dashboard/images/edit" },
      { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
    ]
  })
  await router.push("/dashboard")
  await router.isReady()
  const wrapper = mount(Index, { global: { plugins: [router], stubs: { Icon: true } } })
  await flushPromises()
  return { collections, images, router, wrapper }
}

const action = (key: string) => {
  const item = useDashboardLayout().selection.actions.find((value) => value.key === key)
  if (!item) throw new Error(`Missing selection action ${key}`)
  return item
}
const confirm = async () => {
  const callback = controls.dialog.mock.lastCall?.[0].actions?.[0]?.callback
  if (!callback) throw new Error("Missing confirmation callback")
  await callback()
  await flushPromises()
}

describe("dashboard Index", () => {
  it("shows counts, the dev commit fallback, short grids and the dashboard header", async () => {
    const { wrapper } = await setup()
    expect(wrapper.findAll(".stats h4").map((item) => item.text())).toEqual(["3", "2", "2", "dev"])
    expect(useDashboardLayout().header.title).toBe("Dashboard")
    expect(wrapper.getComponent(ImageGrid).props("shortGrid")).toBe(true)
    expect(wrapper.getComponent(CollectionGrid).props("shortGrid")).toBe(true)
    wrapper.unmount()
    expect(useDashboardLayout().header.title).toBeNull()
    expect(useDashboardLayout().selection.items).toBe(0)
  })

  it("hides both grids when their stores become empty", async () => {
    const { wrapper } = await setup()
    storeToRefs(useImagesStore()).images.value = []
    storeToRefs(useCollectionsStore()).collections.value = []
    await nextTick()
    expect(wrapper.findComponent(ImageGrid).exists()).toBe(false)
    expect(wrapper.findComponent(CollectionGrid).exists()).toBe(false)
    expect(wrapper.findAll(".stats h4").map((item) => item.text())).toEqual(["0", "0", "0", "dev"])
  })

  it("offers single-image edit and disables collection selection", async () => {
    const { images, router, wrapper } = await setup()
    wrapper.getComponent(ImageGrid).vm.$emit("select", images[0], new MouseEvent("click"))
    await nextTick()
    expect(useDashboardLayout().selection.actions.map((item) => item.key)).toEqual([
      "image-delete-bulk",
      "image-download",
      "image-edit-single",
      "selection-cancel"
    ])
    expect(wrapper.getComponent(CollectionGrid).props("allowSelect")).toBe(false)
    action("image-edit-single").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/images/a/edit")
  })

  it("offers bulk image edit, downloads IDs, and toggles repeated selection", async () => {
    const { images, router, wrapper } = await setup()
    const grid = wrapper.getComponent(ImageGrid)
    grid.vm.$emit("select", images[0], new MouseEvent("click"))
    grid.vm.$emit("select", images[1], new MouseEvent("click"))
    await nextTick()
    expect(useDashboardLayout().selection.items).toBe(2)
    action("image-download").onClick()
    expect(useImagesStore().bulkDownload).toHaveBeenCalledExactlyOnceWith(["a", "b"])
    action("image-edit-bulk").onClick()
    await flushPromises()
    expect(router.currentRoute.value.query.ids).toBe("a,b")
    grid.vm.$emit("select", images[1], new MouseEvent("click"))
    await nextTick()
    expect(useDashboardLayout().selection.items).toBe(1)
    action("selection-cancel").onClick()
    await nextTick()
    expect(useDashboardLayout().selection.items).toBe(0)
    expect(wrapper.getComponent(CollectionGrid).props("allowSelect")).toBe(true)
  })

  it("offers select-images and edit only for a single collection", async () => {
    const { collections, router, wrapper } = await setup()
    const grid = wrapper.getComponent(CollectionGrid)
    grid.vm.$emit("select", collections[0], new MouseEvent("click"))
    await nextTick()
    expect(useDashboardLayout().selection.actions.map((item) => item.key)).toEqual([
      "collection-delete-bulk",
      "collection-download",
      "collection-edit-single",
      "collection-select-images",
      "selection-cancel"
    ])
    expect(wrapper.getComponent(ImageGrid).props("allowSelect")).toBe(false)
    action("collection-select-images").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c/images")
    action("collection-edit-single").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c/edit")
    grid.vm.$emit("select", collections[1], new MouseEvent("click"))
    await nextTick()
    expect(useDashboardLayout().selection.actions.map((item) => item.key)).toEqual([
      "collection-delete-bulk",
      "collection-download",
      "selection-cancel"
    ])
    action("collection-download").onClick()
    expect(useCollectionsStore().bulkDownload).toHaveBeenCalledExactlyOnceWith(["c", "e"])
  })

  it.each(["images", "collections"] as const)(
    "confirms bulk %s deletion before calling the store",
    async (kind) => {
      const { collections, images, wrapper } = await setup()
      if (kind === "images") {
        const grid = wrapper.getComponent(ImageGrid)
        grid.vm.$emit("select", images[0], new MouseEvent("click"))
        grid.vm.$emit("select", images[1], new MouseEvent("click"))
      } else {
        const grid = wrapper.getComponent(CollectionGrid)
        grid.vm.$emit("select", collections[0], new MouseEvent("click"))
        grid.vm.$emit("select", collections[1], new MouseEvent("click"))
      }
      await nextTick()
      action(kind === "images" ? "image-delete-bulk" : "collection-delete-bulk").onClick()
      const store = kind === "images" ? useImagesStore() : useCollectionsStore()
      expect(store.bulkRemove).not.toHaveBeenCalled()
      expect(controls.dialog.mock.lastCall?.[0].description).toContain(`Delete 2 ${kind}`)
      await confirm()
      expect(store.bulkRemove).toHaveBeenCalledExactlyOnceWith(
        kind === "images" ? ["a", "b"] : ["c", "e"]
      )
      expect(controls.toast).toHaveBeenCalledWith({
        description: `Deleted 2 ${kind}.`,
        title: kind === "images" ? "Images Deleted" : "Collections Deleted",
        type: "success"
      })
      expect(useDashboardLayout().selection.items).toBe(0)
    }
  )

  it.each(["images", "collections"] as const)(
    "confirms single %s deletion and preserves its selection behavior",
    async (kind) => {
      const { collections, images, wrapper } = await setup()
      if (kind === "images") {
        const grid = wrapper.getComponent(ImageGrid)
        grid.vm.$emit("select", images[0], new MouseEvent("click"))
        grid.vm.$emit("delete", images[0])
      } else {
        const grid = wrapper.getComponent(CollectionGrid)
        grid.vm.$emit("select", collections[0], new MouseEvent("click"))
        grid.vm.$emit("delete", collections[0])
      }
      await nextTick()
      await confirm()
      const store = kind === "images" ? useImagesStore() : useCollectionsStore()
      expect(store.remove).toHaveBeenCalledExactlyOnceWith(kind === "images" ? "a" : "c")
      expect(controls.toast).toHaveBeenCalledWith({
        description: kind === "images" ? "Image deleted." : "Collection deleted.",
        title: kind === "images" ? "Image Deleted" : "Collection Deleted",
        type: "success"
      })
      expect(useDashboardLayout().selection.items).toBe(kind === "images" ? 1 : 0)
    }
  )

  it.each(["images", "collections"] as const)(
    "wires individual %s edit/delete events and error handling",
    async (kind) => {
      const { collections, images, router, wrapper } = await setup()
      if (kind === "images") {
        wrapper.getComponent(ImageGrid).vm.$emit("edit", images[0])
        wrapper.getComponent(ImageGrid).vm.$emit("delete", images[0])
      } else {
        wrapper.getComponent(CollectionGrid).vm.$emit("edit", collections[0])
        wrapper.getComponent(CollectionGrid).vm.$emit("delete", collections[0])
      }
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(
        kind === "images" ? "/dashboard/images/a/edit" : "/dashboard/collections/c/edit"
      )
      const store = kind === "images" ? useImagesStore() : useCollectionsStore()
      vi.mocked(store.remove).mockRejectedValueOnce(new Error("offline"))
      await confirm()
      expect(store.remove).toHaveBeenCalledExactlyOnceWith(kind === "images" ? "a" : "c")
      expect(controls.toast).not.toHaveBeenCalled()
    }
  )
})
