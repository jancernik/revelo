import { mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import type { KnownSettings } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import ImageUploader from "#src/components/dashboard/images/ImageUploader.vue"

const controls = vi.hoisted(() => ({ show: vi.fn() }))
const settings = ref<Partial<KnownSettings>>({})
vi.mock("#src/composables/useToast", () => ({ useToast: () => controls }))
vi.mock("#src/composables/useSettings", () => ({ useSettings: () => ({ settings }) }))

const wrappers: ReturnType<typeof mount>[] = []
const render = () => {
  const wrapper = mount(ImageUploader, { global: { stubs: { Icon: true, ImageGrid: true } } })
  wrappers.push(wrapper)
  return wrapper
}
const file = (name = "photo.jpg", type = "image/jpeg", size = 4) =>
  new File([new Uint8Array(size)], name, { type })
const drop = async (wrapper: ReturnType<typeof render>, files: File[]) => {
  await wrapper.get(".image-uploader").trigger("drop", { dataTransfer: { files } })
}
const select = async (wrapper: ReturnType<typeof render>, files: File[]) => {
  Object.defineProperty(wrapper.get("input").element, "files", { configurable: true, value: files })
  await wrapper.get("input").trigger("change")
}
const createUrl = vi.fn<typeof URL.createObjectURL>()
const revokeUrl = vi.fn<(url: string) => void>()
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  settings.value = {}
  createUrl.mockImplementation(() => `blob:${createUrl.mock.calls.length}`)
  vi.spyOn(URL, "createObjectURL").mockImplementation(createUrl)
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeUrl)
})
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("ImageUploader", () => {
  it("exposes selection, upload and reset with native File identities and preview URLs", async () => {
    const wrapper = render()
    expect(wrapper.vm.hasSelectedImages).toBe(false)
    expect(wrapper.vm.canAddMoreFiles).toBe(true)
    expect(wrapper.vm.hasExceededFileLimit).toBe(false)
    wrapper.vm.handleUploadImages()
    expect(wrapper.emitted("upload")).toBeUndefined()
    const input = wrapper.get("input").element
    const click = vi.spyOn(input, "click")
    wrapper.vm.handleSelectImages()
    expect(click).toHaveBeenCalledOnce()
    await wrapper.get("button").trigger("click")
    expect(click).toHaveBeenCalledTimes(2)
    const first = file()
    const second = file("second.png", "image/png")
    await select(wrapper, [first])
    await drop(wrapper, [second])
    expect(wrapper.vm.hasSelectedImages).toBe(true)
    expect(wrapper.get(".file-counter").text()).toBe("2/10")
    expect(createUrl.mock.calls.map(([item]) => item)).toEqual([first, second])
    expect(createUrl.mock.calls[0]?.[0]).toBe(first)
    wrapper.vm.handleUploadImages()
    const payload = wrapper.emitted("upload")?.[0]?.[0]
    expect(payload).toEqual({ images: [first, second], previewUrls: ["blob:1", "blob:2"] })
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("images" in payload) ||
      !Array.isArray(payload.images)
    )
      throw new Error("Missing upload images")
    expect(payload.images[0]).toBe(first)
    wrapper.vm.handleResetSelection()
    await nextTick()
    expect(revokeUrl.mock.calls).toEqual([["blob:1"], ["blob:2"]])
    expect(wrapper.vm.hasSelectedImages).toBe(false)
    expect(wrapper.find(".no-selection").exists()).toBe(true)
    wrapper.vm.handleUploadImages()
    expect(wrapper.emitted("upload")).toHaveLength(1)
  })

  it("validates MIME and size independently, preserves selection order and accepts exact limits", async () => {
    settings.value = { maxUploadSize: 1 }
    const wrapper = render()
    const invalid = file("bad.gif", "image/gif", 1024 * 1024 + 1)
    const large = file("large.jpg", "image/jpeg", 1024 * 1024 + 1)
    const accepted = file("exact.png", "image/png", 1024 * 1024)
    const looseMime = file("loose.jpg", "image/jpeg-extra")
    await drop(wrapper, [invalid, large, accepted, looseMime])
    expect(controls.show.mock.calls).toEqual([
      [
        {
          description:
            'The file "bad.gif" is not a valid image. Only JPG and PNG files are allowed.',
          title: "Error Adding File",
          type: "error"
        }
      ],
      [
        {
          description: 'The file "bad.gif" exceeds the maximum upload size of 1MB.',
          title: "Error Adding File",
          type: "error"
        }
      ],
      [
        {
          description: 'The file "large.jpg" exceeds the maximum upload size of 1MB.',
          title: "Error Adding File",
          type: "error"
        }
      ]
    ])
    wrapper.vm.handleUploadImages()
    expect(wrapper.emitted("upload")?.[0]).toEqual([
      { images: [accepted, looseMime], previewUrls: ["blob:1", "blob:2"] }
    ])
    expect(createUrl).toHaveBeenCalledTimes(2)
  })

  it("removes the first duplicate filename and revokes only its URL", async () => {
    const wrapper = render()
    const first = file("same.jpg")
    const second = file("same.jpg", "image/png")
    await drop(wrapper, [first, second])
    const grid = wrapper.getComponent(ImageGrid)
    const image = grid.props("images")[1]
    if (!image) throw new Error("Missing grid image")
    grid.vm.$emit("remove", image)
    await nextTick()
    expect(revokeUrl).toHaveBeenCalledWith("blob:1")
    expect(wrapper.get(".file-counter").text()).toBe("1/10")
    wrapper.vm.handleUploadImages()
    expect(wrapper.emitted("upload")?.[0]).toEqual([{ images: [second], previewUrls: ["blob:2"] }])
    wrapper.vm.handleResetSelection()
    expect(revokeUrl.mock.calls).toEqual([["blob:1"], ["blob:2"]])
  })

  it("counts beyond the limit, disables input, but still accepts dropped files and uploads", async () => {
    settings.value = { maxUploadFiles: 1 }
    const wrapper = render()
    await drop(wrapper, [file()])
    expect(wrapper.vm.canAddMoreFiles).toBe(false)
    expect(wrapper.vm.hasExceededFileLimit).toBe(false)
    expect(wrapper.get("input").element.disabled).toBe(true)
    await wrapper.get(".image-uploader").trigger("dragenter")
    expect(wrapper.get(".image-uploader").classes()).not.toContain("drag-active")
    await drop(wrapper, [file("second.jpg")])
    expect(wrapper.vm.hasExceededFileLimit).toBe(true)
    expect(wrapper.get(".file-counter").classes()).toContain("exceeded")
    expect(wrapper.get(".file-counter").text()).toBe("2/1")
    wrapper.vm.handleUploadImages()
    expect(wrapper.emitted("upload")).toHaveLength(1)
    wrapper.vm.handleResetSelection()
    await nextTick()
    expect(wrapper.vm.canAddMoreFiles).toBe(true)
    expect(wrapper.vm.hasExceededFileLimit).toBe(false)
  })

  it("balances nested drag events, prevents defaults and clears drop hiding after 400ms", async () => {
    const wrapper = render()
    const root = wrapper.get(".image-uploader")
    for (const type of ["dragenter", "dragenter", "dragover"]) {
      const event = new Event(type, { cancelable: true })
      root.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    await nextTick()
    expect(root.classes()).toContain("drag-active")
    expect(wrapper.get(".drop-zone").classes()).toContain("active")
    await root.trigger("dragleave")
    expect(root.classes()).toContain("drag-active")
    await root.trigger("dragleave")
    await root.trigger("dragleave")
    expect(root.classes()).not.toContain("drag-active")
    await root.trigger("dragenter")
    expect(root.classes()).toContain("drag-active")
    await drop(wrapper, [])
    expect(root.classes()).not.toContain("drag-active")
    expect(wrapper.get(".drop-zone").classes()).toContain("hidden")
    await vi.advanceTimersByTimeAsync(399)
    expect(wrapper.get(".drop-zone").classes()).toContain("hidden")
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.get(".drop-zone").classes()).not.toContain("hidden")
    await select(wrapper, [])
    expect(wrapper.vm.hasSelectedImages).toBe(false)
  })

  it("reads settings once and preserves falsy fallback limits", async () => {
    settings.value = { maxUploadFiles: 0, maxUploadSize: 0 }
    const wrapper = render()
    expect(wrapper.get(".subtitle").text()).toBe("JPEG and PNG, up to 50MB")
    settings.value = { maxUploadFiles: 1, maxUploadSize: 1 }
    await nextTick()
    expect(wrapper.get(".subtitle").text()).toBe("JPEG and PNG, up to 50MB")
    await drop(wrapper, [file(), file("two.jpg")])
    expect(wrapper.get(".file-counter").text()).toBe("2/10")
    expect(wrapper.vm.canAddMoreFiles).toBe(true)
    const later = render()
    expect(later.get(".subtitle").text()).toBe("JPEG and PNG, up to 1MB")
  })

  it("removes all four native listeners on unmount without revoking selected previews", async () => {
    const add = vi.spyOn(HTMLElement.prototype, "addEventListener")
    const wrapper = render()
    const root = wrapper.get(".image-uploader").element
    await drop(wrapper, [file()])
    const remove = vi.spyOn(root, "removeEventListener")
    const registrations = add.mock.calls.filter((call) =>
      ["dragenter", "dragleave", "dragover", "drop"].includes(call[0])
    )
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(remove.mock.calls).toHaveLength(4)
    for (const registration of registrations)
      expect(remove).toHaveBeenCalledWith(registration[0], registration[1])
    expect(revokeUrl).not.toHaveBeenCalled()
    root.dispatchEvent(new Event("dragenter", { cancelable: true }))
    expect(root.classList.contains("drag-active")).toBe(false)
  })
})
