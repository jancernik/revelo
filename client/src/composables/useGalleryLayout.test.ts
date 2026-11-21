import { enableAutoUnmount, mount } from "@vue/test-utils"
import { gsap } from "gsap"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, reactive, ref } from "vue"

import type { Image, ImageVersion } from "#src/types/models"

import { useGalleryLayout } from "#src/composables/useGalleryLayout"
import { image } from "#src/stores/test/helpers"
import { composableProbe } from "#src/test/composableProbe"

const store = reactive<{ orderBy: "date" | "id" | null; visibleFilteredImages: Image[] }>({
  orderBy: null,
  visibleFilteredImages: []
})
vi.mock("#src/stores/images", () => ({ useImagesStore: () => store }))

const regular = (width: number, height: number): ImageVersion => ({
  height,
  path: "/images/regular.jpg",
  size: 1000,
  storageType: "local",
  type: "regular",
  width
})
const sized = (id: string, width: number, height: number) =>
  image({ id, versions: [regular(width, height)] })

type Layout = ReturnType<typeof useGalleryLayout>
const render = (forcedColumns?: Parameters<typeof useGalleryLayout>[0]) => {
  let layout: Layout | undefined
  mount(
    composableProbe(
      () => useGalleryLayout(forcedColumns),
      (state) => (layout = state)
    )
  )
  if (!layout) throw new Error("The probe did not run")
  return layout
}

const resize = async (width: number, height = 800) => {
  window.innerWidth = width
  window.innerHeight = height
  window.dispatchEvent(new Event("resize"))
  await nextTick()
}

const metrics = (layout: Layout) => ({
  columnCount: layout.columnCount.value,
  columnWidth: layout.columnWidth.value,
  currentSpacing: layout.currentSpacing.value,
  firstColumnMargin: layout.firstColumnMargin.value,
  galleryWidth: layout.galleryWidth.value
})

const ids = (groups: Image[][]) => groups.map((group) => group.map(({ id }) => id))

enableAutoUnmount(afterEach)
beforeEach(() => {
  store.orderBy = null
  store.visibleFilteredImages = []
  vi.stubGlobal("innerWidth", 1280)
  vi.stubGlobal("innerHeight", 800)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("useGalleryLayout", () => {
  it.each([
    [0, 2],
    [390, 2],
    [660, 2],
    [661, 3],
    [980, 3],
    [981, 5],
    [1280, 5],
    [1920, 5]
  ])(
    "uses %spx wide windows for %s columns, skipping even counts above two",
    async (width, count) => {
      const layout = render()
      await resize(width)
      expect(layout.columnCount.value).toBe(count)
    }
  )

  it("lays out narrow windows edge to edge with small spacing", async () => {
    const layout = render()
    await resize(390)
    expect(metrics(layout)).toEqual({
      columnCount: 2,
      columnWidth: 183,
      currentSpacing: 8,
      firstColumnMargin: 8,
      galleryWidth: 390
    })
  })

  it("lays out medium windows with base spacing", async () => {
    const layout = render()
    await resize(800)
    expect(metrics(layout)).toEqual({
      columnCount: 3,
      columnWidth: 720 / 3,
      currentSpacing: 20,
      firstColumnMargin: 20,
      galleryWidth: 800
    })
  })

  it("caps the gallery at 1600px and centres it in wider windows", async () => {
    const layout = render()
    await resize(1920)
    expect(metrics(layout)).toEqual({
      columnCount: 5,
      columnWidth: 296,
      currentSpacing: 20,
      firstColumnMargin: 180,
      galleryWidth: 1600
    })
  })

  it("passes the window size through", async () => {
    const layout = render()
    await resize(1024, 700)
    expect(layout.windowWidth.value).toBe(1024)
    expect(layout.windowHeight.value).toBe(700)
  })

  it.each([2, 3, 4, 5])("uses %s forced columns across the full window width", async (columns) => {
    const layout = render(columns)
    await resize(1920)
    const spacing = columns === 2 ? 8 : 20
    expect(metrics(layout)).toEqual({
      columnCount: columns,
      columnWidth: (1920 - spacing * (columns + 1)) / columns,
      currentSpacing: spacing,
      firstColumnMargin: spacing,
      galleryWidth: 1920
    })
  })

  it.each([1, 6])(
    "ignores %s forced columns for the count but not for the width",
    async (columns) => {
      const layout = render(columns)
      await resize(1920)
      expect(layout.columnCount.value).toBe(5)
      expect(layout.galleryWidth.value).toBe(1920)
      expect(layout.firstColumnMargin.value).toBe(20)
    }
  )

  it("follows a reactive forced column source", async () => {
    const columns = ref<null | number>(null)
    const layout = render(() => columns.value)
    expect(layout.columnCount.value).toBe(5)
    columns.value = 2
    expect(layout.columnCount.value).toBe(2)
    expect(layout.currentSpacing.value).toBe(8)
    columns.value = null
    expect(layout.columnCount.value).toBe(5)
  })

  it("reports whether there are visible images", () => {
    const layout = render()
    expect(layout.noImages.value).toBe(true)
    store.visibleFilteredImages = [image()]
    expect(layout.noImages.value).toBe(false)
    expect(layout.imagesStore).toBe(store)
  })

  it("groups images into ordered columns when the store has an order", async () => {
    const shuffle = vi.spyOn(gsap.utils, "shuffle")
    store.orderBy = "date"
    store.visibleFilteredImages = [
      sized("a", 100, 100),
      sized("b", 200, 100),
      sized("c", 100, 100),
      sized("d", 50, 100)
    ]
    const layout = render()
    await resize(390)
    expect(layout.imageGroups.value).toEqual([])
    layout.updateImageGroups()
    expect(ids(layout.imageGroups.value)).toEqual([["a", "c", "d"], ["b"]])
    expect(shuffle).not.toHaveBeenCalled()
  })

  it("balances by aspect ratio and shuffles each column without an order", async () => {
    const shuffle = vi
      .spyOn(gsap.utils, "shuffle")
      .mockImplementation(<T>(array: T[]) => [...array].reverse())
    store.visibleFilteredImages = [
      sized("a", 100, 100),
      sized("b", 200, 100),
      sized("c", 100, 100),
      sized("d", 50, 100)
    ]
    const layout = render()
    await resize(390)
    layout.updateImageGroups()
    expect(shuffle).toHaveBeenCalledTimes(2)
    expect(ids(layout.imageGroups.value)).toEqual([
      ["d", "b"],
      ["c", "a"]
    ])
  })

  it("only regroups on request", async () => {
    store.orderBy = "id"
    store.visibleFilteredImages = [sized("a", 1, 1)]
    const layout = render()
    layout.updateImageGroups()
    store.visibleFilteredImages = [sized("b", 1, 1)]
    await resize(390)
    expect(ids(layout.imageGroups.value)).toEqual([["a"], [], [], [], []])
    layout.updateImageGroups()
    expect(ids(layout.imageGroups.value)).toEqual([["b"], []])
  })
})
