import { afterEach, describe, expect, it, vi } from "vitest"

import { getFilenameFromDisposition, triggerDownload } from "#src/utils/download"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getFilenameFromDisposition", () => {
  it("extracts a quoted filename", () => {
    expect(getFilenameFromDisposition('attachment; filename="my images.zip"')).toBe("my images.zip")
  })

  it("returns null for a missing, empty or null header", () => {
    expect(getFilenameFromDisposition(undefined)).toBeNull()
    expect(getFilenameFromDisposition("")).toBeNull()
    expect(getFilenameFromDisposition(null)).toBeNull()
  })

  it("does not extract an unquoted filename", () => {
    expect(getFilenameFromDisposition("attachment; filename=images.zip")).toBeNull()
  })
})

describe("triggerDownload", () => {
  it("clicks an attached download anchor, removes it and revokes the object URL", () => {
    const blob = new Blob(["image"], { type: "image/jpeg" })
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:download")
    const revoke = vi.spyOn(URL, "revokeObjectURL")
    const anchors: HTMLAnchorElement[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchors.push(this)
      expect(this.isConnected).toBe(true)
      expect(this.download).toBe("photo.jpg")
      expect(this.getAttribute("href")).toBe("blob:download")
      expect(revoke).not.toHaveBeenCalled()
    })

    triggerDownload(blob, "photo.jpg")

    expect(create).toHaveBeenCalledExactlyOnceWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(anchors).toHaveLength(1)
    expect(anchors[0]?.isConnected).toBe(false)
    expect(document.querySelector('a[download="photo.jpg"]')).toBeNull()
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:download")
  })
})
