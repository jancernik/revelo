import { afterEach, describe, expect, it, vi } from "vitest"

import {
  clamp,
  clearArray,
  createArray,
  debounce,
  easeInOutSine,
  getImageVersion,
  getThumbnailPath,
  lerp,
  smoothingFactor
} from "#src/utils/helpers"

const thumbnail = {
  height: 80,
  path: "/images/thumbnail.jpg",
  size: 1200,
  storageType: "local",
  type: "thumbnail",
  width: 100
} as const

const image = { id: "image-1", versions: [thumbnail] }

afterEach(() => {
  vi.useRealTimers()
})

describe("clamp", () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
    [0, 0, 10, 0],
    [10, 0, 10, 10]
  ])("clamps %s into [%s, %s] as %s", (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected)
  })

  it("returns the maximum when the bounds are inverted", () => {
    expect(clamp(5, 10, 0)).toBe(0)
  })
})

describe("lerp", () => {
  it.each([
    [0, 10, 0, 0],
    [0, 10, 1, 10],
    [0, 10, 0.25, 2.5],
    [10, -10, 0.5, 0],
    [0, 10, 1.5, 15]
  ])("interpolates from %s to %s at %s as %s", (start, end, factor, expected) => {
    expect(lerp(start, end, factor)).toBe(expected)
  })
})

describe("smoothingFactor", () => {
  it.each([
    [1, 0.5],
    [1.5, 0.5],
    [0, 0.5],
    [-0.2, 0.5]
  ])("saturates the factor %s regardless of the frame time", (factor, deltaTime) => {
    expect(smoothingFactor(factor, deltaTime)).toBe(factor >= 1 ? 1 : 0)
  })

  it("keeps the factor for one frame at the reference rate", () => {
    expect(smoothingFactor(0.2, 1 / 60)).toBeCloseTo(0.2, 10)
    expect(smoothingFactor(0.2, 1 / 30, 30)).toBeCloseTo(0.2, 10)
  })

  it("compounds over longer frames and shrinks over shorter ones", () => {
    expect(smoothingFactor(0.2, 2 / 60)).toBeCloseTo(1 - 0.8 ** 2, 10)
    expect(smoothingFactor(0.2, 1 / 120)).toBeCloseTo(1 - Math.sqrt(0.8), 10)
    expect(smoothingFactor(0.2, 0)).toBe(0)
  })
})

describe("createArray", () => {
  it("repeats a value", () => {
    expect(createArray(3, 0)).toEqual([0, 0, 0])
    expect(createArray(0, 7)).toEqual([])
  })

  it("fills from a callback given each index", () => {
    expect(createArray(4, (index) => index * 2)).toEqual([0, 2, 4, 6])
  })

  it("shares one object value across all entries", () => {
    const value = { count: 0 }
    const array = createArray(2, value)
    expect(array[0]).toBe(value)
    expect(array[1]).toBe(value)
  })
})

describe("clearArray", () => {
  it("empties the array in place", () => {
    const array = [1, 2, 3]
    const same = array
    clearArray(array)
    expect(same).toEqual([])
    expect(array).toBe(same)
  })
})

describe("easeInOutSine", () => {
  it.each([
    [0, 0],
    [0.5, 0.5],
    [1, 1]
  ])("maps %s to %s", (progress, expected) => {
    expect(easeInOutSine(progress)).toBeCloseTo(expected, 10)
  })

  it("is symmetric around the midpoint and eases at the ends", () => {
    expect(easeInOutSine(0.25) + easeInOutSine(0.75)).toBeCloseTo(1, 10)
    expect(easeInOutSine(0.1)).toBeLessThan(0.1)
    expect(easeInOutSine(0.9)).toBeGreaterThan(0.9)
  })
})

describe("debounce", () => {
  it("calls back only after the trailing delay and returns nothing", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const run = debounce(callback, 300)
    expect(run()).toBeUndefined()
    vi.advanceTimersByTime(299)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("uses the latest arguments and restarts the delay on repeat calls", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(query: string, page: number) => void>()
    const run = debounce(callback, 300)
    run("first", 1)
    vi.advanceTimersByTime(200)
    run("latest", 2)
    vi.advanceTimersByTime(299)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledExactlyOnceWith("latest", 2)
  })

  it("defaults to a one-second delay", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const run = debounce(callback)
    run()
    vi.advanceTimersByTime(999)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("can schedule another trailing call after the previous one completes", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: string) => void>()
    const run = debounce(callback, 300)
    run("first")
    vi.advanceTimersByTime(300)
    run("second")
    vi.advanceTimersByTime(300)
    expect(callback.mock.calls).toEqual([["first"], ["second"]])
  })
})

describe("getImageVersion", () => {
  it("returns the matching version without copying it", () => {
    expect(getImageVersion(image, "thumbnail")).toBe(thumbnail)
  })

  it("returns an empty object when the requested version is missing", () => {
    expect(getImageVersion(image, "original")).toEqual({})
  })

  it("returns an empty object for an undefined image or missing versions", () => {
    expect(getImageVersion(undefined, "thumbnail")).toEqual({})
    expect(getImageVersion({}, "thumbnail")).toEqual({})
  })
})

describe("getThumbnailPath", () => {
  it("returns the thumbnail path", () => {
    expect(getThumbnailPath(image)).toBe(thumbnail.path)
  })

  it("falls back to an empty string without a thumbnail", () => {
    expect(getThumbnailPath({ versions: [] })).toBe("")
    expect(getThumbnailPath({})).toBe("")
    expect(getThumbnailPath()).toBe("")
  })
})
