import { afterEach, describe, expect, it, vi } from "vitest"

import type { ImageVersion, ImageVersionType } from "#src/types/models"

import { image } from "#src/stores/test/helpers"
import {
  calculateAnimationProgress,
  calculateDistance,
  calculateImageAspectRatio,
  elementCenter,
  getImageVersion,
  groupImages,
  interpolateFadeValue,
  sortStatesByDistance
} from "#src/utils/galleryHelpers"

const version = (type: ImageVersionType, width: number, height: number): ImageVersion => ({
  height,
  path: `/images/${type}.jpg`,
  size: 1000,
  storageType: "local",
  type,
  width
})

const sized = (id: string, width: number, height: number) =>
  image({ id, versions: [version("thumbnail", 10, 10), version("regular", width, height)] })

const placed = (left: number, top: number, width = 10, height = 10) => {
  const element = document.createElement("div")
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ height, width, x: left, y: top })
  )
  return element
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getImageVersion", () => {
  it("finds the version of the requested type", () => {
    const value = sized("a", 300, 200)
    expect(getImageVersion(value, "regular")).toEqual(version("regular", 300, 200))
    expect(getImageVersion(value, "thumbnail")).toEqual(version("thumbnail", 10, 10))
  })

  it("returns an empty object for missing images, versions or types", () => {
    expect(getImageVersion(sized("a", 1, 1), "original")).toEqual({})
    expect(getImageVersion({}, "regular")).toEqual({})
    expect(getImageVersion(undefined, "regular")).toEqual({})
    expect(getImageVersion(null, "regular")).toEqual({})
  })
})

describe("calculateImageAspectRatio", () => {
  it("divides the regular width by its height, rounded to three decimals", () => {
    expect(calculateImageAspectRatio(sized("a", 300, 200))).toBe(1.5)
    expect(calculateImageAspectRatio(sized("a", 100, 300))).toBe(0.333)
    expect(calculateImageAspectRatio(sized("a", 200, 300))).toBe(0.667)
  })

  it("ignores the other versions", () => {
    const value = image({ versions: [version("thumbnail", 400, 100), version("original", 9, 1)] })
    expect(calculateImageAspectRatio(value)).toBe(0)
  })

  it("is zero without a positive regular height", () => {
    expect(calculateImageAspectRatio(sized("a", 300, 0))).toBe(0)
    expect(calculateImageAspectRatio(sized("a", 300, -10))).toBe(0)
    expect(calculateImageAspectRatio(image())).toBe(0)
    expect(calculateImageAspectRatio(null)).toBe(0)
    expect(calculateImageAspectRatio()).toBe(0)
  })
})

describe("groupImages", () => {
  const wide = sized("wide", 200, 100)
  const landscape = sized("landscape", 150, 100)
  const square = sized("square", 100, 100)
  const portrait = sized("portrait", 50, 100)

  it("balances the widest images first across the groups", () => {
    const groups = groupImages([portrait, square, landscape, wide], 2)
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([
      ["wide", "portrait"],
      ["landscape", "square"]
    ])
  })

  it("keeps the input order when asked to", () => {
    const groups = groupImages([portrait, square, landscape, wide], 2, { preserveOrder: true })
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([
      ["portrait", "landscape"],
      ["square", "wide"]
    ])
  })

  it("fills the first lightest group on ties and leaves extra groups empty", () => {
    const groups = groupImages([square, sized("other", 100, 100)], 4)
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([
      ["square"],
      ["other"],
      [],
      []
    ])
  })

  it("treats images without a regular version as weightless", () => {
    const groups = groupImages([image({ id: "none" }), wide, image({ id: "empty" })], 2)
    expect(groups.map((group) => group.map(({ id }) => id))).toEqual([["wide"], ["none", "empty"]])
  })

  it("returns copies of the images without the internal weight", () => {
    const [[first]] = groupImages([wide], 1)
    expect(first).toEqual(wide)
    expect(first).not.toBe(wide)
    expect(first).not.toHaveProperty("_weight")
  })

  it("does not reorder the input array", () => {
    const list = [portrait, wide]
    groupImages(list, 2)
    expect(list).toEqual([portrait, wide])
  })

  it("returns no groups for an empty or missing list", () => {
    expect(groupImages([], 3)).toEqual([])
    expect(groupImages(undefined, 3)).toEqual([])
  })

  it("returns the input list itself, ungrouped, without a positive group count", () => {
    const list = [wide, square]
    expect(groupImages(list, 0)).toBe(list)
    expect(groupImages(list, -1)).toBe(list)
    expect(groupImages(list, Number.NaN)).toBe(list)
  })
})

describe("elementCenter", () => {
  it("returns the centre of the element's bounding box", () => {
    expect(elementCenter(placed(10, 20, 100, 50))).toEqual({ x: 60, y: 45 })
  })
})

describe("calculateDistance", () => {
  it("returns the Euclidean distance between two points", () => {
    expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(calculateDistance({ x: 3, y: 4 }, { x: 0, y: 0 })).toBe(5)
    expect(calculateDistance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0)
  })
})

describe("sortStatesByDistance", () => {
  const states = () => [
    { element: placed(95, 0), name: "far" },
    { element: placed(-5, -5), name: "near" },
    { element: placed(15, -5), name: "middle" }
  ]

  it("sorts nearest first by default, in place", () => {
    const list = states()
    const sorted = sortStatesByDistance(list, { x: 0, y: 0 })
    expect(sorted).toBe(list)
    expect(sorted.map(({ name }) => name)).toEqual(["near", "middle", "far"])
  })

  it("sorts farthest first when descending", () => {
    const sorted = sortStatesByDistance(states(), { x: 0, y: 0 }, false)
    expect(sorted.map(({ name }) => name)).toEqual(["far", "middle", "near"])
  })
})

describe("calculateAnimationProgress", () => {
  it("has not started before the delay elapses", () => {
    expect(calculateAnimationProgress(1099, 1000, 100, 200)).toEqual({
      progress: 0,
      started: false
    })
  })

  it("starts exactly at the delay and progresses linearly", () => {
    expect(calculateAnimationProgress(1100, 1000, 100, 200)).toEqual({ progress: 0, started: true })
    expect(calculateAnimationProgress(1150, 1000, 100, 200)).toEqual({
      progress: 0.25,
      started: true
    })
  })

  it("clamps progress at one after the duration", () => {
    expect(calculateAnimationProgress(1300, 1000, 100, 200)).toEqual({ progress: 1, started: true })
    expect(calculateAnimationProgress(5000, 1000, 100, 200)).toEqual({ progress: 1, started: true })
  })
})

describe("interpolateFadeValue", () => {
  it("interpolates linearly without an easing function", () => {
    expect(interpolateFadeValue(0, 1, 0.25)).toBe(0.25)
    expect(interpolateFadeValue(1, 0.5, 0.5)).toBe(0.75)
    expect(interpolateFadeValue(1, 0, 0)).toBe(1)
  })

  it("applies the easing function to the progress", () => {
    const ease = vi.fn((progress: number) => progress * progress)
    expect(interpolateFadeValue(0, 10, 0.5, ease)).toBe(2.5)
    expect(ease).toHaveBeenCalledWith(0.5)
  })
})
