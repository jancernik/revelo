import { flushPromises, mount, RouterLinkStub } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { reactive } from "vue"

import type { Image } from "#src/types/models"

import ImageGrid from "#src/components/dashboard/ImageGrid.vue"
import { gridImage, uploadedGridImage } from "#src/test/gridFixtures"

const controls = vi.hoisted(() => ({
  cleanup: vi.fn(),
  init: vi.fn<
    (container: HTMLElement, images: Image[], reorder: (images: Image[]) => void) => void
  >(),
  push: vi.fn()
}))
vi.mock("vue-router", () => ({ useRouter: () => ({ push: controls.push }) }))
vi.mock("#src/composables/useSortableGrid", () => ({ useSortableGrid: () => controls }))

const wrappers: ReturnType<typeof mount>[] = []
const render = (props: InstanceType<typeof ImageGrid>["$props"]) => {
  const wrapper = mount(ImageGrid, {
    global: { stubs: { Icon: true, RouterLink: RouterLinkStub } },
    props
  })
  wrappers.push(wrapper)
  return wrapper
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

describe("ImageGrid", () => {
  it("renders five images and the view-all link only in short mode", async () => {
    const images = Array.from({ length: 7 }, (_, i) => gridImage(String(i)))
    const wrapper = render({ images, shortGrid: true })
    expect(wrapper.findAll(".image-item")).toHaveLength(5)
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/dashboard/images")
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe("View all")
    await wrapper.setProps({ shortGrid: false })
    expect(wrapper.findAll(".image-item")).toHaveLength(7)
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })

  it("preserves image and mouse-event identities for selection and selects from the image", async () => {
    const image = reactive(gridImage())
    const wrapper = render({ images: [image], selectedImagesIds: [image.id], showActions: true })
    expect(wrapper.classes()).toContain("is-selecting")
    expect(wrapper.get(".image-item").classes()).toContain("selected")
    expect(wrapper.find(".image-actions").exists()).toBe(false)
    const event = new MouseEvent("click", { bubbles: true })
    wrapper.get(".select-button").element.dispatchEvent(event)
    expect(wrapper.emitted("select")?.[0]?.[0]).toBe(image)
    expect(wrapper.emitted("select")?.[0]?.[1]).toBe(event)
    await wrapper.get(".image-container").trigger("click")
    expect(wrapper.emitted("select")).toHaveLength(2)
    expect(controls.push).not.toHaveBeenCalled()
  })

  it("opens only when clicks are allowed and fast select chooses selection even without allowSelect", async () => {
    const image = reactive(gridImage())
    const wrapper = render({ images: [image] })
    await wrapper.get(".image-container").trigger("click")
    expect(controls.push).toHaveBeenCalledWith(`/dashboard/images/${image.id}`)
    await wrapper.setProps({ allowClick: false })
    expect(wrapper.get(".image-container").classes()).not.toContain("clickable")
    await wrapper.get(".image-container").trigger("click")
    expect(controls.push).toHaveBeenCalledTimes(1)
    await wrapper.setProps({
      allowClick: true,
      allowSelect: false,
      fastSelect: true,
      showActions: true
    })
    expect(wrapper.find(".select-button").exists()).toBe(false)
    expect(wrapper.find(".image-actions").exists()).toBe(false)
    await wrapper.get(".image-container").trigger("click")
    expect(wrapper.emitted("select")?.[0]?.[0]).toBe(image)
  })

  it("shows hidden state, thumbnail and description, emits actions with the original image", async () => {
    const image = reactive(gridImage("hidden", true))
    const wrapper = render({ images: [image], showActions: true })
    expect(wrapper.get(".image-item").classes()).toContain("hidden")
    expect(wrapper.find(".hidden-indicator").exists()).toBe(true)
    expect(wrapper.get("img").attributes()).toMatchObject({
      alt: "Description hidden",
      loading: "lazy",
      src: "/thumb/hidden"
    })
    const actions = wrapper.findAll(".action-button")
    await actions[0]?.trigger("click")
    await actions[1]?.trigger("click")
    expect(wrapper.emitted("edit")?.[0]?.[0]).toBe(image)
    expect(wrapper.emitted("delete")?.[0]?.[0]).toBe(image)
  })

  it("shows upload names, sizes and explicit paths and gates removal independently of actions", async () => {
    const image = reactive({
      id: "preview",
      name: "preview.jpg",
      path: "blob:preview",
      size: 1572864
    })
    const wrapper = render({
      allowRemove: true,
      images: [image],
      showFileNames: true,
      showFileSizes: true,
      srcAttribute: "path"
    })
    expect(wrapper.get("img").attributes("src")).toBe("blob:preview")
    expect(wrapper.get(".file-name").text()).toBe("preview.jpg")
    expect(wrapper.get(".file-size").text()).toBe("1.50 MB")
    expect(wrapper.find(".hidden-indicator").exists()).toBe(false)
    expect(wrapper.find(".remove-button").exists()).toBe(false)
    await wrapper.setProps({ allowSelect: false })
    const event = new MouseEvent("click", { bubbles: true })
    wrapper.get(".remove-button").element.dispatchEvent(event)
    expect(wrapper.emitted("remove")?.[0]?.[0]).toBe(image)
    expect(wrapper.emitted("remove")?.[0]?.[1]).toBe(event)
    await wrapper.setProps({ fastSelect: true })
    expect(wrapper.find(".remove-button").exists()).toBe(false)
    await wrapper.setProps({ allowRemove: false, fastSelect: false })
    expect(wrapper.find(".remove-button").exists()).toBe(false)
  })

  it("falls back to the uploaded filename and does not show an absent or zero size", () => {
    const wrapper = render({
      images: [uploadedGridImage(), { id: "zero", name: "zero", path: "blob:zero", size: 0 }],
      showFileNames: true,
      showFileSizes: true
    })
    expect(wrapper.findAll(".file-name").map((row) => row.text())).toEqual(["original.jpg", "zero"])
    expect(wrapper.findAll(".file-size")).toHaveLength(0)
  })

  it("initializes only on a reorder toggle, forwards order identity and cleans up on disable and unmount", async () => {
    const images = [gridImage("a"), gridImage("b")]
    const wrapper = render({ allowReorder: true, images })
    await flushPromises()
    expect(wrapper.classes()).toContain("is-reordering")
    expect(controls.init).not.toHaveBeenCalled()
    await wrapper.setProps({ allowReorder: false })
    expect(controls.cleanup).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ allowReorder: true })
    await flushPromises()
    expect(controls.init).toHaveBeenCalledWith(wrapper.element, images, expect.any(Function))
    const callback = controls.init.mock.calls[0]?.[2]
    const reordered = [images[1], images[0]].filter((image): image is Image => image !== undefined)
    callback?.(reordered)
    expect(wrapper.emitted("reorder")?.[0]?.[0]).toBe(reordered)
    wrapper.unmount()
    expect(controls.cleanup).toHaveBeenCalledTimes(2)
  })

  it("does not initialize an empty reorder grid", async () => {
    const wrapper = render({ images: [] })
    await wrapper.setProps({ allowReorder: true })
    await flushPromises()
    expect(controls.init).not.toHaveBeenCalled()
  })
})
