import type { Pinia } from "pinia"

import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import {
  activatePinia,
  collection,
  collectionRow,
  deferred,
  failure,
  image,
  response,
  success
} from "#src/stores/test/helpers"
import api from "#src/utils/api"
import { triggerDownload } from "#src/utils/download"

const toast = vi.hoisted(() => vi.fn())
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }
}))
vi.mock("#src/utils/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/download")>()),
  triggerDownload: vi.fn()
}))

let pinia: Pinia
beforeEach(() => {
  pinia = activatePinia()
  vi.resetAllMocks()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const seed = async (values = [collection()]) => {
  const store = useCollectionsStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ collections: values }))
  await store.fetchAll({ force: true })
  vi.mocked(api.get).mockClear()
  return store
}

const seedImages = async (values = [image()]) => {
  const store = useImagesStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ images: values }))
  await store.fetchAll({ force: true })
  vi.mocked(api.get).mockClear()
  return store
}

describe("collection fetching", () => {
  it.each([false, true])(
    "uses authentication parameters for fetchAll: %s",
    async (authenticated) => {
      if (authenticated) localStorage.setItem("accessToken", "token")
      const store = useCollectionsStore()
      vi.mocked(api.get).mockResolvedValue(success({ collections: [collection()] }))
      expect(await store.fetchAll()).toEqual([collection()])
      expect(api.get).toHaveBeenCalledExactlyOnceWith("/collections", {
        params: authenticated ? { includeHidden: true } : {}
      })
      expect(store.collections).toEqual([collection()])
      expect(store.initialized).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    }
  )

  it("guards loading and initialization but permits forced refresh", async () => {
    const pending = deferred<ReturnType<typeof success>>()
    vi.mocked(api.get)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(success({ collections: [] }))
    const store = useCollectionsStore()
    const first = store.fetchAll()
    await store.fetchAll()
    expect(api.get).toHaveBeenCalledTimes(1)
    await store.fetchAll({ force: true })
    expect(api.get).toHaveBeenCalledTimes(2)
    pending.resolve(success({ collections: [] }))
    await first
    await store.fetchAll()
    expect(api.get).toHaveBeenCalledTimes(2)
    await store.refreshCollections()
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it("initializes once and falls back to an empty list", async () => {
    vi.mocked(api.get).mockResolvedValue(success({}))
    const store = useCollectionsStore()
    await store.initialize()
    await store.initialize()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(store.collections).toEqual([])
  })

  it("returns a cached collection without refreshing unless forced", async () => {
    const original = collection()
    const store = await seed([original])
    const cached = await store.fetch(original.id)
    expect(await store.fetch(original.id)).toBe(cached)
    expect(api.get).not.toHaveBeenCalled()
    const updated = { ...original, title: "Fresh" }
    vi.mocked(api.get).mockResolvedValue(success({ collection: updated }))
    expect(await store.fetch(original.id, { force: true })).toEqual(updated)
    expect(store.collections).toEqual([updated])
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/collections/${original.id}`, { params: {} })
  })

  it("fetches and appends a missing collection with includeHidden for auth", async () => {
    localStorage.setItem("accessToken", "token")
    vi.mocked(api.get).mockResolvedValue(success({ collection: collection("c") }))
    const store = useCollectionsStore()
    expect(await store.fetch("c")).toEqual(collection("c"))
    expect(store.collections).toEqual([collection("c")])
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/collections/c", {
      params: { includeHidden: true }
    })
  })
})

describe("collection mutations", () => {
  it("creates and caches the backend's unhydrated collection row", async () => {
    const row = collectionRow("c")
    vi.mocked(api.post).mockResolvedValue(success({ collection: row }))
    const store = useCollectionsStore()
    expect(await store.create({ description: "Description", title: "Title" })).toEqual(row)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/collections", {
      description: "Description",
      title: "Title"
    })
    expect(store.collections).toEqual([row])
  })

  it("merges an updated collection row without losing cached images", async () => {
    const a = image()
    const store = await seed([collection("c", [a])])
    const row = { ...collectionRow("c"), title: "Updated" }
    vi.mocked(api.put).mockResolvedValue(success({ collection: row }))
    expect(await store.update("c", { title: "Updated" })).toEqual(row)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c", {
      description: undefined,
      title: "Updated"
    })
    expect(store.collections).toEqual([{ ...row, images: [a] }])
  })

  it("removes collections without clearing image membership locally", async () => {
    const a = image({ collectionId: "a" })
    const images = await seedImages([a])
    const store = await seed([collection("a"), collection("b"), collection("c")])
    vi.mocked(api.delete).mockResolvedValue(success(null))
    await store.remove("a")
    expect(api.delete).toHaveBeenNthCalledWith(1, "/collections/a")
    expect(store.collections).toEqual([collection("b"), collection("c")])
    expect(images.images).toEqual([a])
    await store.bulkRemove(["b", "c"])
    expect(api.delete).toHaveBeenNthCalledWith(2, "/collections", { data: { ids: ["b", "c"] } })
    expect(store.collections).toEqual([])
  })

  it("adds unique ids after the existing collection order and updates image metadata", async () => {
    const a = image({ collectionId: "c", collectionOrder: 0, id: "a" })
    const b = image({ collectionId: "c", collectionOrder: 2, id: "b" })
    const c = image({ id: "c" })
    const images = await seedImages([a, b, c])
    const store = await seed([collection("c", [b, a])])
    const sync = vi.spyOn(images, "updateLocal")
    vi.mocked(api.get).mockResolvedValue(success({ collection: collection("c", [b, a]) }))
    const updated = collection("c", [
      a,
      { ...b, collectionOrder: 1 },
      { ...c, collectionId: "c", collectionOrder: 2 }
    ])
    vi.mocked(api.put).mockResolvedValue(success({ collection: updated }))
    expect(await store.addImages("c", ["b", "c", "c"])).toEqual(updated)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c/images", {
      imageIds: ["a", "b", "c"]
    })
    expect(sync.mock.calls).toEqual([
      ["b", { collectionId: "c", collectionOrder: 1 }],
      ["c", { collectionId: "c", collectionOrder: 2 }],
      ["c", { collectionId: "c", collectionOrder: 2 }]
    ])
    expect(images.images).toEqual(updated.images)
    expect(store.collections).toEqual([updated])
  })

  it("clears removed membership without updating surviving image orders", async () => {
    const a = image({ collectionId: "c", collectionOrder: 0, id: "a" })
    const b = image({ collectionId: "c", collectionOrder: 1, id: "b" })
    const images = await seedImages([a, b])
    const store = await seed([collection("c", [a, b])])
    const sync = vi.spyOn(images, "updateLocal")
    vi.mocked(api.get).mockResolvedValue(success({ collection: collection("c", [a, b]) }))
    const updated = collection("c", [{ ...b, collectionOrder: 0 }])
    vi.mocked(api.put).mockResolvedValue(success({ collection: updated }))
    expect(await store.removeImages("c", ["a"])).toEqual(updated)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c/images", { imageIds: ["b"] })
    expect(sync).toHaveBeenCalledExactlyOnceWith("a", { collectionId: null, collectionOrder: null })
    expect(store.collections).toEqual([updated])
    expect(images.images).toEqual([{ ...a, collectionId: null, collectionOrder: null }, b])
  })

  it("keeps backend survivor renumbering in the collection cache after an add/remove sequence", async () => {
    const a = image({ id: "a" })
    const b = image({ id: "b" })
    const assignedA = { ...a, collectionId: "c", collectionOrder: 0 }
    const assignedB = { ...b, collectionId: "c", collectionOrder: 1 }
    const added = collection("c", [assignedA, assignedB])
    const removed = collection("c", [{ ...assignedB, collectionOrder: 0 }])
    const images = await seedImages([a, b])
    const store = await seed([collection("c")])
    vi.mocked(api.get)
      .mockResolvedValueOnce(success({ collection: collection("c") }))
      .mockResolvedValueOnce(success({ collection: added }))
    vi.mocked(api.put)
      .mockResolvedValueOnce(success({ collection: added }))
      .mockResolvedValueOnce(success({ collection: removed }))

    await store.addImages("c", ["a", "b"])
    expect(store.collections).toEqual([added])
    expect(images.images).toEqual([assignedA, assignedB])
    await store.removeImages("c", ["a"])
    expect(vi.mocked(api.put).mock.calls).toEqual([
      ["/collections/c/images", { imageIds: ["a", "b"] }],
      ["/collections/c/images", { imageIds: ["b"] }]
    ])
    expect(store.collections).toEqual([removed])
    expect(images.images).toEqual([a, assignedB])
  })

  it("rebuilds a new image order using old collection and image-store cache entries", async () => {
    const a = image({ collectionId: "c", collectionOrder: 0, id: "a" })
    const b = image({ collectionId: "c", collectionOrder: 1, id: "b" })
    const c = image({ id: "c" })
    const images = await seedImages([a, b, c])
    const store = await seed([collection("c", [a, b])])
    const sync = vi.spyOn(images, "updateLocal")
    const returned = collection("c", [
      { ...c, collectionId: "c", collectionOrder: 0 },
      { ...b, collectionOrder: 1 }
    ])
    vi.mocked(api.put).mockResolvedValue(success({ collection: returned }))
    expect(await store.setImages("c", ["c", "b"])).toEqual(returned)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/collections/c/images", {
      imageIds: ["c", "b"]
    })
    expect(store.collections).toEqual([
      collection("c", [
        { ...c, collectionOrder: 0 },
        { ...b, collectionOrder: 1 }
      ])
    ])
    expect(images.images).toEqual([
      { ...a, collectionId: null, collectionOrder: null },
      b,
      { ...c, collectionId: "c", collectionOrder: 0 }
    ])
    expect(sync.mock.calls).toEqual([
      ["a", { collectionId: null, collectionOrder: null }],
      ["c", { collectionId: "c", collectionOrder: 0 }],
      ["b", { collectionId: "c", collectionOrder: 1 }]
    ])
  })

  it("drops unresolved ids from the cache rebuild and compresses its collectionOrder", async () => {
    const a = image({ collectionId: "c", collectionOrder: 0, id: "a" })
    const b = image({ collectionId: "c", collectionOrder: 1, id: "b" })
    const images = await seedImages([a, b])
    const store = await seed([collection("c", [a, b])])
    vi.mocked(api.put).mockResolvedValue(
      success({ collection: collection("c", [b, image({ id: "missing" }), a]) })
    )
    await store.setImages("c", ["b", "missing", "a"])
    expect(store.collections).toEqual([
      collection("c", [
        { ...b, collectionOrder: 0 },
        { ...a, collectionOrder: 1 }
      ])
    ])
    expect(images.images).toEqual([
      { ...a, collectionOrder: 2 },
      { ...b, collectionOrder: 0 }
    ])
  })
})

describe("local collection helpers", () => {
  it("sorts supplied images in place by collectionOrder with null treated as zero", async () => {
    const a = image({ collectionOrder: null, id: "a" }),
      b = image({ collectionOrder: 2, id: "b" }),
      c = image({ collectionOrder: 1, id: "c" })
    const value = collection("c", [b, a, c])
    expect(await useCollectionsStore().getImageIdsInCollection(value)).toEqual(["a", "c", "b"])
    expect(value.images).toEqual([a, c, b])
    expect(api.get).not.toHaveBeenCalled()
    expect(await useCollectionsStore().getImageIdsInCollection(null)).toEqual([])
  })

  it("forces a refresh when getting ids by collection id", async () => {
    const store = await seed([collection("c", [image({ id: "old" })])])
    vi.mocked(api.get).mockResolvedValue(
      success({ collection: collection("c", [image({ id: "fresh" })]) })
    )
    expect(await store.getImageIdsInCollection("c")).toEqual(["fresh"])
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/collections/c", { params: {} })
  })

  it("updates only the first matching collection image", async () => {
    const a = image()
    const store = await seed([collection("one", [a]), collection("two", [a])])
    store.updateImageLocal(a.id, { hidden: true })
    expect(store.collections).toEqual([
      collection("one", [{ ...a, hidden: true }]),
      collection("two", [a])
    ])
    store.updateImageLocal("missing", { hidden: true })
    expect(store.collections).toHaveLength(2)
  })

  it("removes image matches from all collections and tolerates unhydrated rows", async () => {
    const a = image()
    const store = await seed([collection("one", [a]), collection("two", [a])])
    vi.mocked(api.post).mockResolvedValue(success({ collection: collectionRow("bare") }))
    await store.create()
    store.updateImageLocal("missing", { hidden: true })
    store.removeImageLocal(a.id)
    expect(store.collections).toEqual([collection("one"), collection("two"), collectionRow("bare")])
  })
})

describe("collection downloads", () => {
  it("downloads a single collection using the server filename", async () => {
    const blob = new Blob(["zip"])
    vi.mocked(api.get).mockResolvedValue(
      response(blob, { "content-disposition": 'attachment; filename="album.zip"' })
    )
    await useCollectionsStore().download("c")
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/collections/c/download", {
      responseType: "blob"
    })
    expect(triggerDownload).toHaveBeenCalledExactlyOnceWith(blob, "album.zip")
  })

  it("downloads several collections using the server filename", async () => {
    const blob = new Blob(["zip"])
    vi.mocked(api.post).mockResolvedValue(
      response(blob, { "content-disposition": 'attachment; filename="albums.zip"' })
    )
    await useCollectionsStore().bulkDownload(["a", "b"])
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/collections/download",
      { ids: ["a", "b"] },
      { responseType: "blob" }
    )
    expect(triggerDownload).toHaveBeenCalledExactlyOnceWith(blob, "albums.zip")
  })

  it("rejects a non-string disposition through the download error path", async () => {
    vi.mocked(api.get).mockResolvedValue(
      response(new Blob(["bytes"]), { "content-disposition": 123 })
    )
    await expect(useCollectionsStore().download("c")).rejects.toBeInstanceOf(Error)
    expect(triggerDownload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Download Failed", type: "error" })
    )
  })

  it("uses the single and bulk fallback names", async () => {
    const blob = new Blob(["zip"])
    vi.mocked(api.get).mockResolvedValue(response(blob))
    vi.mocked(api.post).mockResolvedValue(response(blob))
    const store = useCollectionsStore()
    await store.download("a")
    await store.bulkDownload(["a"])
    expect(vi.mocked(triggerDownload).mock.calls).toEqual([
      [blob, "collection.zip"],
      [blob, "collections.zip"]
    ])
  })
})

const errorCases: {
  download?: boolean
  method: "delete" | "get" | "post" | "put"
  run: (store: ReturnType<typeof useCollectionsStore>) => Promise<unknown>
  title: string
}[] = [
  { method: "get", run: (store) => store.fetchAll(), title: "Error Fetching Collections" },
  { method: "get", run: (store) => store.fetch("c"), title: "Error Fetching Collection" },
  {
    method: "post",
    run: (store) => store.create({ title: "Title" }),
    title: "Error Creating Collection"
  },
  { method: "put", run: (store) => store.update("c", {}), title: "Error Updating Collection" },
  { method: "delete", run: (store) => store.remove("c"), title: "Error Deleting Collection" },
  {
    method: "delete",
    run: (store) => store.bulkRemove(["c"]),
    title: "Error Deleting Collections"
  },
  { method: "put", run: (store) => store.addImages("c", ["a"]), title: "Error Adding Images" },
  { method: "put", run: (store) => store.removeImages("c", ["a"]), title: "Error Removing Images" },
  { method: "put", run: (store) => store.setImages("c", ["a"]), title: "Error Setting Images" },
  { download: true, method: "get", run: (store) => store.download("c"), title: "Download Failed" },
  {
    download: true,
    method: "post",
    run: (store) => store.bulkDownload(["c"]),
    title: "Download Failed"
  }
]

it.each(errorCases)(
  "shows a toast and rethrows $title ($method)",
  async ({ download, method, run, title }) => {
    const error = failure("Axios detail", "Backend detail")
    vi.mocked(api.get).mockResolvedValue(success({ collection: collection("c") }))
    vi.mocked(api[method]).mockRejectedValue(error)
    await expect(run(useCollectionsStore())).rejects.toBe(error)
    expect(toast).toHaveBeenCalledWith({
      description: download ? "Axios detail" : "Backend detail",
      title,
      type: "error"
    })
  }
)
