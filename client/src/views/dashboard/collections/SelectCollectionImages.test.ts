import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { storeToRefs } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Collection, Image } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import { gridCollection, gridImage } from "#src/test/gridFixtures"
import SelectCollectionImages from "#src/views/dashboard/collections/SelectCollectionImages.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/stores/collections", () => {
  const store = {
    fetch: vi.fn<(id: string) => Promise<Collection>>(),
    getImageIdsInCollection: vi.fn<(collection: Collection | null) => Promise<string[]>>(),
    setImages: vi.fn<(id: string, imageIds: string[]) => Promise<void>>()
  }
  return { useCollectionsStore: () => store }
})
vi.mock("#src/stores/images", async () => {
  const { ref } = await import("vue")
  const store = { images: ref<Image[]>([]) }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
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

const collection: Collection = gridCollection("c1", 1)

const image = (id: string, collectionId: null | string): Image => ({
  ...gridImage(id),
  collectionId,
  collectionOrder: null
})

const available = [image("a", null), image("b", "c1")]

const setup = async (images: Image[] = available) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/collections/c1/images")
  await router.isReady()
  storeToRefs(useImagesStore()).images.value = images
  vi.mocked(useCollectionsStore().fetch).mockResolvedValue(collection)
  vi.mocked(useCollectionsStore().getImageIdsInCollection).mockResolvedValue(["b"])
  const wrapper = mount(SelectCollectionImages, {
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
  const target = images.find((item) => item.id === imageId)
  if (!target) throw new Error(`Missing image ${imageId}`)
  grid(wrapper).vm.$emit("select", target, new MouseEvent("click", { shiftKey }))
  await nextTick()
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
  storeToRefs(useImagesStore()).images.value = []
  const store = useCollectionsStore()
  vi.mocked(store.fetch).mockReset().mockResolvedValue(collection)
  vi.mocked(store.getImageIdsInCollection).mockReset().mockResolvedValue([])
  vi.mocked(store.setImages).mockReset().mockResolvedValue(null)
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("SelectCollectionImages", () => {
  it("registers the layout and shows only available images", async () => {
    const { wrapper } = await setup()
    expect(useCollectionsStore().fetch).toHaveBeenCalledWith("c1")
    expect(
      grid(wrapper)
        .props("images")
        .map((item) => item.id)
    ).toEqual(["a", "b"])
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Select collection images")
    expect(layout.footer.actions.map((action) => action.key)).toEqual(["cancel", "save"])
    expect(layout.footer.actions.map((action) => action.text)).toEqual(["Cancel", "Save Changes"])
  })

  it("starts from the collection's current image ids", async () => {
    const { wrapper } = await setup()
    expect(useCollectionsStore().getImageIdsInCollection).toHaveBeenCalledWith(collection)
    expect(grid(wrapper).props("selectedImagesIds")).toEqual(["b"])
  })

  it("keeps images from other collections out of the available list", async () => {
    const { wrapper } = await setup([image("a", null), image("b", "c1"), image("c", "other")])
    expect(
      grid(wrapper)
        .props("images")
        .map((item) => item.id)
    ).toEqual(["a", "b"])
  })

  it("selects and deselects images through the grid", async () => {
    const { wrapper } = await setup()
    await select(wrapper, "a")
    expect(grid(wrapper).props("selectedImagesIds")).toEqual(["b", "a"])
    await select(wrapper, "a")
    expect(grid(wrapper).props("selectedImagesIds")).toEqual(["b"])
  })

  it("saves the selection through setImages and navigates with a toast", async () => {
    const { router, wrapper } = await setup()
    await select(wrapper, "a")
    footerAction("save").onClick()
    await flushPromises()
    expect(useCollectionsStore().setImages).toHaveBeenCalledWith("c1", ["b", "a"])
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1")
    expect(toast).toHaveBeenCalledWith({
      description: "Collection updated successfully.",
      title: "Collection Updated",
      type: "success"
    })
  })

  it("cancels back to the collection", async () => {
    const { router } = await setup()
    footerAction("cancel").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1")
  })

  it("renders the empty state when no images are available", async () => {
    const { wrapper } = await setup([image("c", "other")])
    expect(wrapper.findComponent(ImageGrid).exists()).toBe(false)
    expect(wrapper.text()).toContain("No images available")
  })
})
