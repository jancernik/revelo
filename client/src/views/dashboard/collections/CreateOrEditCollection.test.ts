import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Collection } from "#src/types/models"

import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useCollectionsStore } from "#src/stores/collections"
import { gridCollection } from "#src/test/gridFixtures"
import CreateOrEditCollection from "#src/views/dashboard/collections/CreateOrEditCollection.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: dialog.show }) }))
vi.mock("#src/stores/collections", () => {
  const store = {
    create: vi.fn<(data: { description: string; title: string }) => Promise<Collection>>(),
    fetch: vi.fn<(id: string) => Promise<Collection>>(),
    update: vi.fn<(id: string, data: { description: string; title: string }) => Promise<void>>()
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
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const edited: Collection = { ...gridCollection("c1", 1), description: "Desc c1" }

const setup = async (mode: "create" | "edit") => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(mode === "create" ? "/dashboard/collections/new" : "/dashboard/collections/c1")
  await router.isReady()
  if (mode === "edit") vi.mocked(useCollectionsStore().fetch).mockResolvedValue(edited)
  const wrapper = mount(CreateOrEditCollection, {
    global: { plugins: [router], stubs: { Icon: true } },
    props: mode === "edit" ? { id: "c1" } : {}
  })
  await flushPromises()
  return { router, wrapper }
}

const footerAction = (key: string) => {
  const action = useDashboardLayout().footer.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing footer action ${key}`)
  return action
}

const fillAndSubmit = async (wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) => {
  await wrapper.find("input").setValue("My title")
  await wrapper.find("textarea").setValue("My description")
  await wrapper.find("form").trigger("submit")
  await flushPromises()
}

beforeEach(() => {
  useDashboardLayout().reset()
  toast.mockReset()
  dialog.show.mockClear()
  const store = useCollectionsStore()
  vi.mocked(store.fetch).mockReset().mockResolvedValue(edited)
  vi.mocked(store.create)
    .mockReset()
    .mockResolvedValue({ ...gridCollection("new-id", 0), description: null })
  vi.mocked(store.update).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("CreateOrEditCollection", () => {
  it("registers the create layout and creates on submit", async () => {
    const { router, wrapper } = await setup("create")
    expect(useCollectionsStore().fetch).not.toHaveBeenCalled()
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("New collection")
    expect(layout.footer.actions.map((action) => action.key)).toEqual(["cancel", "save"])
    expect(layout.footer.actions.map((action) => action.text)).toEqual([
      "Cancel",
      "Create Collection"
    ])
    await fillAndSubmit(wrapper)
    expect(useCollectionsStore().create).toHaveBeenCalledWith({
      description: "My description",
      title: "My title"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/new-id")
    expect(toast).toHaveBeenCalledWith({
      description: "Collection created successfully.",
      title: "Collection Created",
      type: "success"
    })
  })

  it("loads the collection for editing, prefills the form and updates on submit", async () => {
    const { router, wrapper } = await setup("edit")
    expect(useCollectionsStore().fetch).toHaveBeenCalledWith("c1")
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Edit collection")
    expect(layout.footer.actions.map((action) => action.text)).toEqual(["Cancel", "Save Changes"])
    await wrapper.find("form").trigger("submit")
    await flushPromises()
    expect(useCollectionsStore().update).toHaveBeenCalledWith("c1", {
      description: "Desc c1",
      title: "Title c1"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1")
    expect(toast).toHaveBeenCalledWith({
      description: "Collection updated successfully.",
      title: "Collection Updated",
      type: "success"
    })
  })

  it("cancels back to the list from create mode", async () => {
    const { router } = await setup("create")
    footerAction("cancel").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections")
  })

  it("cancels back to the collection from edit mode", async () => {
    const { router } = await setup("edit")
    footerAction("cancel").onClick()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe("/dashboard/collections/c1")
  })
})
