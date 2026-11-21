import type { Pinia } from "pinia"

import { disposePinia, setActivePinia } from "pinia"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { DescriptionSource } from "#src/types/models"

import { useCollectionsStore } from "#src/stores/collections"
import { useImagesStore } from "#src/stores/images"
import {
  activatePinia,
  collection,
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
  vi.useFakeTimers()
})
afterEach(() => {
  disposePinia(pinia)
  setActivePinia(undefined)
  vi.restoreAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const seed = async (values = [image()]) => {
  const store = useImagesStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ images: values }))
  await store.fetchAll({ force: true })
  vi.mocked(api.get).mockClear()
  return store
}

const seedCollection = async (values = [image()]) => {
  const store = useCollectionsStore()
  vi.mocked(api.get).mockResolvedValueOnce(success({ collections: [collection("c", values)] }))
  await store.fetchAll({ force: true })
  vi.mocked(api.get).mockClear()
  return store
}

describe("image fetching", () => {
  it.each([false, true])(
    "sends includeHidden only when authenticated: %s",
    async (authenticated) => {
      if (authenticated) localStorage.setItem("accessToken", "token")
      const store = useImagesStore()
      const values = [image(), image({ hidden: true, id: "hidden" })]
      vi.mocked(api.get).mockResolvedValue(success({ images: values }))
      expect(await store.fetchAll()).toEqual(values)
      expect(api.get).toHaveBeenCalledExactlyOnceWith("/images", {
        params: authenticated ? { includeHidden: true } : {}
      })
      expect(store.images).toEqual(values)
      expect(store.visibleFilteredImages).toEqual([values[0]])
      expect(store.loading).toBe(false)
      expect(store.initialized).toBe(true)
      expect(store.error).toBeNull()
    }
  )

  it("respects loading and initialized guards and allows force", async () => {
    const pending = deferred<ReturnType<typeof success>>()
    const store = useImagesStore()
    vi.mocked(api.get)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(success({ images: [] }))
    const first = store.fetchAll()
    await store.fetchAll()
    expect(api.get).toHaveBeenCalledTimes(1)
    await store.fetchAll({ force: true })
    expect(api.get).toHaveBeenCalledTimes(2)
    pending.resolve(success({ images: [] }))
    await first
    await store.fetchAll()
    expect(api.get).toHaveBeenCalledTimes(2)
    await store.refreshImages()
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it("initializes only once", async () => {
    vi.mocked(api.get).mockResolvedValue(success({ images: [] }))
    const store = useImagesStore()
    await store.initialize()
    await store.initialize()
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it("refetches with ordering only when orderBy is set", async () => {
    vi.mocked(api.get).mockResolvedValue(success({ images: [] }))
    const store = useImagesStore()
    expect(store.setOrder({ order: "desc", orderBy: "date" })).toBeUndefined()
    await vi.advanceTimersByTimeAsync(0)
    expect(api.get).toHaveBeenLastCalledWith("/images", {
      params: { order: "desc", orderBy: "date" }
    })
    store.setOrder({ order: "asc" })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.get).toHaveBeenLastCalledWith("/images", { params: {} })
    expect(store.order).toBe("asc")
    expect(store.orderBy).toBeUndefined()
  })

  it("returns a cached image without a request unless forced", async () => {
    const original = image()
    const store = await seed([original])
    const cached = await store.fetch(original.id)
    expect(await store.fetch(original.id)).toBe(cached)
    expect(api.get).not.toHaveBeenCalled()
    const refreshed = image({ comment: "fresh" })
    vi.mocked(api.get).mockResolvedValue(success({ image: refreshed }))
    expect(await store.fetch(original.id, { force: true })).toEqual(refreshed)
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/images/${original.id}`, { params: {} })
    expect(store.images).toEqual([original])
  })

  it("fetches uncached images with auth parameters without populating the cache", async () => {
    localStorage.setItem("accessToken", "token")
    vi.mocked(api.get).mockResolvedValue(success({ image: image() }))
    const store = useImagesStore()
    expect(await store.fetch("image-1")).toEqual(image())
    expect(store.images).toEqual([])
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/images/image-1", {
      params: { includeHidden: true }
    })
  })

  it("falls back to empty arrays when list data is missing", async () => {
    vi.mocked(api.get).mockResolvedValue(success({}))
    const store = useImagesStore()
    expect(await store.fetchAll()).toEqual([])
    expect(store.visibleFilteredImages).toEqual([])
  })
})

describe("image changes", () => {
  it("uploads files as FormData with multipart headers", async () => {
    const files = [
      new File(["a"], "a.jpg", { type: "image/jpeg" }),
      new File(["b"], "b.png", { type: "image/png" })
    ]
    const reviews = [{ filePath: "/staged/a.jpg", metadata: { iso: "100" }, sessionId: "session" }]
    vi.mocked(api.post).mockResolvedValue(success({ images: reviews }))
    expect(await useImagesStore().uploadForReview(files)).toEqual(reviews)
    const body: unknown = vi.mocked(api.post).mock.calls[0]?.[1]
    if (!(body instanceof FormData)) throw new Error("Expected FormData")
    expect(body.getAll("images")).toEqual(files)
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/upload/review", body, {
      headers: { "Content-Type": "multipart/form-data" }
    })
  })

  it("confirms upload and appends the returned images", async () => {
    const original = image()
    const added = {
      ...image({ id: "added" }),
      createdAt: "2026-11-13T12:00:00.000Z",
      originalFilename: "added.jpg",
      updatedAt: "2026-11-13T12:00:00.000Z"
    }
    const store = await seed([original])
    const input = [{ metadata: { camera: "Camera" }, sessionId: "session" }]
    vi.mocked(api.post).mockResolvedValue(success({ images: [added] }))
    expect(await store.confirmUpload(input)).toEqual([added])
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/upload/confirm", { images: input })
    expect(store.images).toEqual([original, added])
  })

  it("updates metadata in the image and collection caches", async () => {
    const original = image()
    const store = await seed([original])
    const collections = await seedCollection([original])
    const sync = vi.spyOn(collections, "updateImageLocal")
    const updated = image({ comment: "Edited", iso: 200 })
    vi.mocked(api.put).mockResolvedValue(success({ image: updated }))
    expect(await store.updateMetadata(original.id, { comment: "Edited", iso: "200" })).toEqual(
      updated
    )
    expect(api.put).toHaveBeenCalledExactlyOnceWith(`/images/${original.id}/metadata`, {
      comment: "Edited",
      iso: "200"
    })
    expect(store.images).toEqual([updated])
    expect(collections.collections).toEqual([collection("c", [updated])])
    expect(sync).toHaveBeenCalledExactlyOnceWith(original.id, updated)
  })

  it("bulk-updates metadata and synchronizes each collection image", async () => {
    const originals = [image({ id: "a" }), image({ id: "b" })]
    const updated = originals.map((value) => ({ ...value, hidden: true }))
    const store = await seed(originals)
    const collections = await seedCollection(originals)
    const sync = vi.spyOn(collections, "updateImageLocal")
    vi.mocked(api.put).mockResolvedValue(success({ images: updated }))
    expect(await store.bulkUpdateMetadata(["a", "b"], { hidden: true })).toEqual(updated)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/images/metadata", {
      ids: ["a", "b"],
      metadata: { hidden: true }
    })
    expect(store.images).toEqual(updated)
    expect(collections.collections).toEqual([collection("c", updated)])
    expect(sync.mock.calls).toEqual([
      ["a", updated[0]],
      ["b", updated[1]]
    ])
  })

  it("updates only existing local ids", async () => {
    const original = image()
    const store = await seed([original])
    store.updateLocal("missing", { hidden: true })
    expect(store.images).toEqual([original])
    store.updateLocal(original.id, { hidden: true })
    expect(store.images).toEqual([{ ...original, hidden: true }])
  })

  it("removes an image from both image lists and all collection caches", async () => {
    const a = image({ id: "a" }),
      b = image({ id: "b" })
    const store = await seed([a, b])
    const collections = await seedCollection([a, b])
    const sync = vi.spyOn(collections, "removeImageLocal")
    vi.mocked(api.delete).mockResolvedValue(success(null))
    await store.remove("a")
    expect(api.delete).toHaveBeenCalledExactlyOnceWith("/images/a")
    expect(store.images).toEqual([b])
    expect(store.visibleFilteredImages).toEqual([b])
    expect(collections.collections).toEqual([collection("c", [b])])
    expect(sync).toHaveBeenCalledExactlyOnceWith("a")
  })

  it("bulk-removes images and synchronizes every removed id", async () => {
    const a = image({ id: "a" }),
      b = image({ id: "b" }),
      c = image({ id: "c" })
    const store = await seed([a, b, c])
    const collections = await seedCollection([a, b, c])
    const sync = vi.spyOn(collections, "removeImageLocal")
    vi.mocked(api.delete).mockResolvedValue(success(null))
    await store.bulkRemove(["a", "c"])
    expect(api.delete).toHaveBeenCalledExactlyOnceWith("/images", { data: { ids: ["a", "c"] } })
    expect(store.images).toEqual([b])
    expect(store.visibleFilteredImages).toEqual([b])
    expect(sync.mock.calls).toEqual([["a"], ["c"]])
  })

  it("routes single and bulk hidden toggles through metadata updates", async () => {
    const store = await seed([image()])
    vi.mocked(api.put)
      .mockResolvedValueOnce(success({ image: image({ hidden: true }) }))
      .mockResolvedValueOnce(success({ images: [image()] }))
    await store.toggleHidden("image-1", true)
    expect(api.put).toHaveBeenNthCalledWith(1, "/images/image-1/metadata", { hidden: true })
    await store.bulkToggleHidden(["image-1"], false)
    expect(api.put).toHaveBeenNthCalledWith(2, "/images/metadata", {
      ids: ["image-1"],
      metadata: { hidden: false }
    })
  })
})

describe("image descriptions", () => {
  const written = (language: string, text: string, source: DescriptionSource = "generated") => ({
    language,
    source,
    text,
    updatedAt: "2026-11-16T12:00:00.000Z"
  })
  const pending = (language: string) => ({ language, source: null, text: null, updatedAt: null })

  it("loads the list and stores written texts by language in every cache", async () => {
    const original = image({ descriptions: { en: "Old", es: "Viejo" } })
    const store = await seed([original])
    const collections = await seedCollection([original])
    const list = [written("en", "A harbour at dusk"), pending("es")]
    vi.mocked(api.get).mockResolvedValue(success({ descriptions: list }))
    expect(await store.fetchDescriptions(original.id)).toEqual(list)
    expect(api.get).toHaveBeenCalledExactlyOnceWith(`/images/${original.id}/descriptions`)
    const expected = image({ descriptions: { en: "A harbour at dusk" } })
    expect(store.images).toEqual([expected])
    expect(store.visibleFilteredImages).toEqual([expected])
    expect(collections.collections).toEqual([collection("c", [expected])])
  })

  it("keeps the other fields of the image when descriptions change", async () => {
    const original = image({ camera: "Leica", descriptions: {}, hidden: true })
    const store = await seed([original])
    vi.mocked(api.get).mockResolvedValue(success({ descriptions: [written("en", "Text")] }))
    await store.fetchDescriptions(original.id)
    expect(store.images).toEqual([{ ...original, descriptions: { en: "Text" } }])
  })

  it("saves one language and returns the refreshed list", async () => {
    const store = await seed([image()])
    const list = [written("en", "Edited text", "edited"), written("es", "Texto", "translated")]
    vi.mocked(api.put).mockResolvedValue(success({ descriptions: list }))
    expect(await store.updateDescription("image-1", "en", "Edited text")).toEqual(list)
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/images/image-1/descriptions/en", {
      text: "Edited text"
    })
    expect(store.images[0].descriptions).toEqual({ en: "Edited text", es: "Texto" })
  })

  it.each([
    { body: { languages: ["es"] }, languages: ["es"] },
    { body: {}, languages: undefined }
  ])("regenerates $languages and drops the discarded texts", async ({ body, languages }) => {
    const store = await seed([image({ descriptions: { en: "Text", es: "Texto" } })])
    const list = [written("en", "Text"), pending("es")]
    vi.mocked(api.post).mockResolvedValue(success({ descriptions: list }))
    expect(await store.regenerateDescriptions("image-1", languages)).toEqual(list)
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/images/image-1/descriptions/regenerate",
      body
    )
    expect(store.images[0].descriptions).toEqual({ en: "Text" })
  })

  it("treats a response without a list as no descriptions", async () => {
    const store = await seed([image({ descriptions: { en: "Text" } })])
    vi.mocked(api.get).mockResolvedValue(response({}))
    expect(await store.fetchDescriptions("image-1")).toEqual([])
    expect(store.images[0].descriptions).toEqual({})
  })

  it("returns the list for an image outside the caches without adding it", async () => {
    const store = await seed([image()])
    const list = [written("en", "Text")]
    vi.mocked(api.get).mockResolvedValue(success({ descriptions: list }))
    expect(await store.fetchDescriptions("elsewhere")).toEqual(list)
    expect(store.images).toEqual([image()])
  })

  it("leaves the caches untouched when a request fails", async () => {
    const original = image({ descriptions: { en: "Text" } })
    const store = await seed([original])
    const collections = await seedCollection([original])
    vi.mocked(api.put).mockRejectedValue(failure("Axios detail", "Description text too long"))
    await expect(store.updateDescription(original.id, "en", "Long")).rejects.toThrow()
    expect(store.images).toEqual([original])
    expect(collections.collections).toEqual([collection("c", [original])])
  })
})

describe("image downloads", () => {
  it("uses a quoted disposition filename for single downloads", async () => {
    const blob = new Blob(["image"])
    vi.mocked(api.get).mockResolvedValue(
      response(blob, { "content-disposition": 'attachment; filename="photo.jpg"' })
    )
    await useImagesStore().download("a")
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/images/a/download", { responseType: "blob" })
    expect(triggerDownload).toHaveBeenCalledExactlyOnceWith(blob, "photo.jpg")
  })

  it("uses a quoted disposition filename for bulk downloads", async () => {
    const blob = new Blob(["zip"])
    vi.mocked(api.post).mockResolvedValue(
      response(blob, { "content-disposition": 'attachment; filename="photos.zip"' })
    )
    await useImagesStore().bulkDownload(["a", "b"])
    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      "/images/download",
      { ids: ["a", "b"] },
      { responseType: "blob" }
    )
    expect(triggerDownload).toHaveBeenCalledExactlyOnceWith(blob, "photos.zip")
  })

  it("uses fallback filenames without disposition headers", async () => {
    const blob = new Blob(["bytes"])
    vi.mocked(api.get).mockResolvedValue(response(blob))
    vi.mocked(api.post).mockResolvedValue(response(blob))
    const store = useImagesStore()
    await store.download("a")
    await store.bulkDownload(["a"])
    expect(vi.mocked(triggerDownload).mock.calls).toEqual([
      [blob, "image.jpg"],
      [blob, "images.zip"]
    ])
  })

  it("rejects a non-string disposition through the download error path", async () => {
    vi.mocked(api.get).mockResolvedValue(
      response(new Blob(["bytes"]), { "content-disposition": 123 })
    )
    await expect(useImagesStore().download("a")).rejects.toBeInstanceOf(Error)
    expect(triggerDownload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Download Failed", type: "error" })
    )
  })

  it("keeps the download-specific fallback for an empty Error message", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error(""))
    await expect(useImagesStore().download("a")).rejects.toBeInstanceOf(Error)
    expect(toast).toHaveBeenCalledWith({
      description: "Failed to download image.",
      title: "Download Failed",
      type: "error"
    })
  })
})

describe("image search", () => {
  it("debounces for 300ms, normalizes the latest query and returns nothing", async () => {
    localStorage.setItem("accessToken", "token")
    const store = await seed([image()])
    const result = image({ id: "result" })
    vi.mocked(api.get).mockResolvedValue(success({ images: [result] }))
    expect(store.search("first")).toBeUndefined()
    await vi.advanceTimersByTimeAsync(200)
    store.search("  LATEST  ")
    await vi.advanceTimersByTimeAsync(299)
    expect(api.get).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/images/search", {
      params: { includeHidden: true, text: "latest" }
    })
    expect(store.visibleFilteredImages).toEqual([result])
    expect(store.loading).toBe(false)
  })

  it("restores the full list for an empty query without a request", async () => {
    const originals = [image({ id: "a" }), image({ hidden: true, id: "b" })]
    const store = await seed(originals)
    vi.mocked(api.get).mockResolvedValue(success({ images: [image({ id: "result" })] }))
    store.search("query")
    await vi.advanceTimersByTimeAsync(300)
    vi.mocked(api.get).mockClear()
    store.search("   ")
    await vi.advanceTimersByTimeAsync(300)
    expect(api.get).not.toHaveBeenCalled()
    expect(store.visibleFilteredImages).toEqual([originals[0]])
  })

  it("leaves separate search results unchanged when the main cache is updated", async () => {
    const store = await seed([image()])
    vi.mocked(api.get).mockResolvedValue(success({ images: [image()] }))
    store.search("query")
    await vi.advanceTimersByTimeAsync(300)
    store.updateLocal("image-1", { hidden: true })
    expect(store.images).toEqual([image({ hidden: true })])
    expect(store.visibleFilteredImages).toEqual([image()])
  })

  it("shows search errors, resets loading and rejects its background callback", async () => {
    const store = useImagesStore()
    const error = failure("Axios detail", "Search detail")
    vi.mocked(api.get).mockRejectedValue(error)
    const schedule = globalThis.setTimeout
    const rejected: unknown[] = []
    vi.spyOn(globalThis, "setTimeout").mockImplementation((callback, delay, ...args) =>
      schedule(() => {
        const completion: unknown = typeof callback === "function" ? callback(...args) : undefined
        if (completion instanceof Promise)
          void completion.catch((reason: unknown) => {
            rejected.push(reason)
          })
      }, delay)
    )
    expect(store.search("query")).toBeUndefined()
    await vi.advanceTimersByTimeAsync(300)
    expect(rejected).toEqual([error])
    expect(store.error).toBe("Search detail")
    expect(store.loading).toBe(false)
    expect(toast).toHaveBeenCalledWith({
      description: "Search detail",
      title: "Error Fetching Images",
      type: "error"
    })
  })
})

const errorCases: {
  download?: boolean
  method: "delete" | "get" | "post" | "put"
  run: (store: ReturnType<typeof useImagesStore>) => Promise<unknown>
  title: string
}[] = [
  { method: "get", run: (store) => store.fetchAll(), title: "Error Fetching Images" },
  { method: "get", run: (store) => store.fetch("a"), title: "Error Fetching Image" },
  { method: "post", run: (store) => store.uploadForReview([]), title: "Error Uploading Images" },
  { method: "post", run: (store) => store.confirmUpload([]), title: "Error Confirming Images" },
  {
    method: "put",
    run: (store) => store.updateMetadata("a", {}),
    title: "Error Updating Metadata"
  },
  {
    method: "put",
    run: (store) => store.bulkUpdateMetadata(["a"], {}),
    title: "Error Updating Metadata"
  },
  {
    method: "get",
    run: (store) => store.fetchDescriptions("a"),
    title: "Error Loading Descriptions"
  },
  {
    method: "put",
    run: (store) => store.updateDescription("a", "en", "Text"),
    title: "Error Saving Description"
  },
  {
    method: "post",
    run: (store) => store.regenerateDescriptions("a"),
    title: "Error Regenerating Description"
  },
  { method: "delete", run: (store) => store.remove("a"), title: "Error Deleting Image" },
  { method: "delete", run: (store) => store.bulkRemove(["a"]), title: "Error Deleting Images" },
  { download: true, method: "get", run: (store) => store.download("a"), title: "Download Failed" },
  {
    download: true,
    method: "post",
    run: (store) => store.bulkDownload(["a"]),
    title: "Download Failed"
  },
  {
    method: "put",
    run: (store) => store.toggleHidden("a", true),
    title: "Error Updating Metadata"
  },
  {
    method: "put",
    run: (store) => store.bulkToggleHidden(["a"], true),
    title: "Error Updating Metadata"
  }
]

it.each(errorCases)(
  "shows a toast and rethrows $title ($method)",
  async ({ download, method, run, title }) => {
    const error = failure("Axios detail", "Backend detail")
    vi.mocked(api[method]).mockRejectedValue(error)
    await expect(run(useImagesStore())).rejects.toBe(error)
    expect(toast).toHaveBeenCalledExactlyOnceWith({
      description: download ? "Axios detail" : "Backend detail",
      title,
      type: "error"
    })
  }
)
