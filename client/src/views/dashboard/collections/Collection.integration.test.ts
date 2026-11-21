import type { Pinia } from "pinia"

import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { activatePinia, failure, success } from "#src/stores/test/helpers"
import { gridCollection, gridImage } from "#src/test/gridFixtures"
import api from "#src/utils/api"
import Collection from "#src/views/dashboard/collections/Collection.vue"
import SelectCollectionImages from "#src/views/dashboard/collections/SelectCollectionImages.vue"

const toast = vi.hoisted(() => vi.fn())
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useSortableGrid", () => ({
  useSortableGrid: () => ({ cleanup: vi.fn(), init: vi.fn() })
}))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))

enableAutoUnmount(afterEach)
let pinia: Pinia
beforeEach(() => {
  vi.resetAllMocks()
  pinia = activatePinia()
  useDashboardLayout().reset()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  useDashboardLayout().reset()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const seed = async () => {
  const initial = gridCollection("c", 2)
  initial.images = initial.images.map((image, collectionOrder) => ({
    ...image,
    collectionId: initial.id,
    collectionOrder
  }))
  const available = gridImage("available")
  const other = { ...gridImage("other"), collectionId: "different-collection" }
  const images = useImagesStore()
  vi.mocked(api.get).mockResolvedValueOnce(
    success({ images: [...initial.images, available, other] })
  )
  await images.fetchAll({ force: true })
  const collections = useCollectionsStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ collections: [initial] }))
  await collections.fetchAll({ force: true })
  vi.mocked(api.get).mockClear()
  return { available, collections, images, initial }
}

const routerAt = async (path: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ component: { template: "<div />" }, path: "/:pathMatch(.*)*" }]
  })
  await router.push(path)
  await router.isReady()
  return router
}

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

describe("collection views with real stores", () => {
  it("saves reordered images through the API boundary and refreshes both caches and the grid", async () => {
    const { collections, images, initial } = await seed()
    const router = await routerAt("/dashboard/collections/c")
    const wrapper = mount(Collection, {
      global: { plugins: [pinia, router], stubs: { Icon: true } },
      props: { id: "c" }
    })
    await flushPromises()
    headerAction("reorder").onClick()
    await nextTick()
    const reordered = [...initial.images].reverse()
    wrapper.getComponent(ImageGrid).vm.$emit("reorder", reordered)
    await nextTick()
    const renumbered = reordered.map((image, collectionOrder) => ({ ...image, collectionOrder }))
    vi.mocked(api.put).mockResolvedValueOnce(
      success({ collection: { ...initial, images: renumbered } })
    )
    await headerAction("save-order").onClick()
    await flushPromises()
    const ids = reordered.map((image) => image.id)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c/images", { imageIds: ids })
    expect(collections.collections[0]?.images?.map((image) => image.id)).toEqual(ids)
    expect(collections.collections[0]?.images?.map((image) => image.collectionOrder)).toEqual([
      0, 1
    ])
    expect(
      ids.map((id) => images.images.find((image) => image.id === id)?.collectionOrder)
    ).toEqual([0, 1])
    expect(
      wrapper
        .getComponent(ImageGrid)
        .props("images")
        .map((image) => image.id)
    ).toEqual(ids)
    expect(wrapper.getComponent(ImageGrid).props("allowReorder")).toBe(false)
    expect(headerAction("reorder").text).toBe("Reorder")
    expect(toast).toHaveBeenCalledWith({
      description: "Image order saved.",
      title: "Order Saved",
      type: "success"
    })
  })

  it("leaves the persisted caches unchanged and exits reorder mode after a failed save", async () => {
    const { collections, images, initial } = await seed()
    const expected = structuredClone(initial)
    const router = await routerAt("/dashboard/collections/c")
    const wrapper = mount(Collection, {
      global: { plugins: [pinia, router], stubs: { Icon: true } },
      props: { id: "c" }
    })
    await flushPromises()
    headerAction("reorder").onClick()
    await nextTick()
    wrapper.getComponent(ImageGrid).vm.$emit("reorder", [...initial.images].reverse())
    await nextTick()
    vi.mocked(api.put).mockRejectedValueOnce(failure("offline"))
    await headerAction("save-order").onClick()
    await flushPromises()
    expect(collections.collections).toEqual([expected])
    expect(images.images.filter((image) => image.collectionId === "c")).toEqual(expected.images)
    expect(wrapper.getComponent(ImageGrid).props("images")).toEqual(expected.images)
    expect(wrapper.getComponent(ImageGrid).props("allowReorder")).toBe(false)
    expect(headerAction("reorder").text).toBe("Reorder")
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: "offline",
      title: "Error Setting Images",
      type: "error"
    })
  })

  it("restores selection, excludes other collections and saves membership through real stores", async () => {
    const { available, collections, images, initial } = await seed()
    const router = await routerAt("/dashboard/collections/c/images")
    const wrapper = mount(SelectCollectionImages, {
      global: { plugins: [pinia, router], stubs: { Icon: true } },
      props: { id: "c" }
    })
    await flushPromises()
    const grid = wrapper.getComponent(ImageGrid)
    expect(grid.props("images").map((image) => image.id)).toEqual(["c-0", "c-1", "available"])
    expect(grid.props("selectedImagesIds")).toEqual(["c-0", "c-1"])
    grid.vm.$emit("select", available, new MouseEvent("click"))
    await nextTick()
    const updated = {
      ...initial,
      images: [...initial.images, { ...available, collectionId: "c", collectionOrder: 2 }]
    }
    vi.mocked(api.put).mockResolvedValueOnce(success({ collection: updated }))
    await footerAction("save").onClick()
    await flushPromises()
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c/images", {
      imageIds: ["c-0", "c-1", "available"]
    })
    expect(collections.collections[0]?.images?.map((image) => image.id)).toEqual([
      "c-0",
      "c-1",
      "available"
    ])
    expect(
      collections.collections[0]?.images?.find((image) => image.id === "available")
    ).toMatchObject({
      collectionId: "c",
      collectionOrder: 2
    })
    expect(images.images.find((image) => image.id === "available")).toMatchObject({
      collectionId: "c",
      collectionOrder: 2
    })
    expect(images.images.find((image) => image.id === "other")?.collectionId).toBe(
      "different-collection"
    )
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c")
    expect(toast).toHaveBeenCalledWith({
      description: "Collection updated successfully.",
      title: "Collection Updated",
      type: "success"
    })
  })
})
