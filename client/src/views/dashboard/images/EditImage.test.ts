import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

import type { DialogOptions } from "#src/composables/useDialog"
import type { Image, ImageDescription } from "#src/types/models"

import Input from "#src/components/common/Input.vue"
import DescriptionEditor from "#src/components/dashboard/images/DescriptionEditor.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useImagesStore } from "#src/stores/images"
import { gridImage } from "#src/test/gridFixtures"
import EditImage from "#src/views/dashboard/images/EditImage.vue"

vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/stores/images", () => {
  const store = {
    fetch: vi.fn<(id: string) => Promise<Image>>(),
    fetchDescriptions: vi.fn<(id: string) => Promise<ImageDescription[]>>(),
    updateMetadata: vi.fn<(id: string, metadata: unknown) => Promise<Image>>()
  }
  return { useImagesStore: () => store }
})

const toast = vi.hoisted(() => vi.fn())
const dialog = vi.hoisted(() => ({ show: vi.fn<(options: DialogOptions) => void>() }))

enableAutoUnmount(afterEach)

const routes = [
  { component: { template: "<div />" }, name: "images-list", path: "/dashboard/images" },
  { component: { template: "<div />" }, name: "image-view", path: "/dashboard/images/:id" },
  { component: { template: "<div />" }, path: "/:pathMatch(.*)*" }
]

const image: Image = {
  ...gridImage("img-1"),
  aperture: "f/8",
  camera: "Canon",
  date: "2026-01-02T10:00:00.000Z",
  iso: 200
}

const initialMetadata = {
  aperture: "f/8",
  camera: "Canon",
  comment: "",
  date: "2026-01-02",
  focalLength: "",
  focalLengthEquivalent: "",
  iso: 200,
  lens: "",
  shutterSpeed: ""
}

const changedMetadata = {
  aperture: "f/8",
  camera: "Nikon",
  comment: "",
  date: "2026-01-02",
  focalLength: "",
  focalLengthEquivalent: "",
  iso: 200,
  lens: "",
  shutterSpeed: ""
}

const setup = async (realEditor = false) => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push("/dashboard/images/img-1/edit")
  await router.isReady()
  const wrapper = mount(EditImage, {
    global: {
      plugins: [router],
      stubs: { DescriptionEditor: !realEditor, Icon: true, MetadataEditor: !realEditor }
    },
    props: { id: "img-1" }
  })
  await flushPromises()
  return { router, wrapper }
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
  const store = useImagesStore()
  vi.mocked(store.fetch).mockReset().mockResolvedValue(image)
  vi.mocked(store.fetchDescriptions).mockReset().mockResolvedValue([])
  vi.mocked(store.updateMetadata).mockReset().mockResolvedValue(image)
})

afterEach(() => {
  useDashboardLayout().reset()
})

describe("EditImage", () => {
  it("round-trips real editor input, resets it and sends string ISO with the complete save payload", async () => {
    const { router, wrapper } = await setup(true)
    const fields = wrapper.findAllComponents(Input)
    const camera = fields.find((field) => field.props("label") === "Camera")
    const iso = fields.find((field) => field.props("label") === "ISO")
    if (!camera || !iso) throw new Error("Missing metadata input")
    expect(camera.get("input").element.value).toBe("Canon")
    expect(iso.get("input").element.value).toBe("200")
    expect(footerAction("save").disabled).toBe(true)
    await camera.get("input").setValue("Nikon")
    await flushPromises()
    expect(footerAction("save").disabled).toBe(false)
    const reset = useDashboardLayout().header.actions.find((action) => action.key === "reset")
    if (!reset) throw new Error("Missing reset action")
    reset.onClick()
    await flushPromises()
    expect(camera.get("input").element.value).toBe("Canon")
    expect(footerAction("save").disabled).toBe(true)
    await camera.get("input").setValue("Nikon")
    await flushPromises()
    await footerAction("save").onClick()
    await flushPromises()
    expect(useImagesStore().updateMetadata).toHaveBeenCalledExactlyOnceWith("img-1", {
      ...changedMetadata,
      iso: "200"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/img-1")
  })

  it("maps the image into the editor metadata and registers the layout", async () => {
    const { wrapper } = await setup()
    expect(useImagesStore().fetch).toHaveBeenCalledOnce()
    expect(useImagesStore().fetch).toHaveBeenCalledWith("img-1")
    const editor = wrapper.getComponent(MetadataEditor)
    expect(editor.props("initialMetadata")).toEqual(initialMetadata)
    expect(editor.props("showHeader")).toBe(false)
    expect(editor.props("showPreview")).toBe(false)
    expect(editor.props("showResetButton")).toBe(false)
    const layout = useDashboardLayout()
    expect(layout.header.title).toBe("Edit Image")
    expect(layout.header.actions).toEqual([])
    expect(layout.footer.actions.map((action) => action.key)).toEqual(["cancel", "save"])
    expect(footerAction("save").text).toBe("Save Changes")
    expect(footerAction("save").disabled).toBe(true)
    expect(footerAction("cancel").disabled).toBeUndefined()
  })

  it("describes the preview with the English description", async () => {
    const { wrapper } = await setup()
    expect(wrapper.get(".image-preview img").attributes()).toMatchObject({
      alt: "Description img-1",
      title: "Description img-1"
    })
  })

  it("leaves the preview undescribed when the image has no English description", async () => {
    vi.mocked(useImagesStore().fetch).mockResolvedValue({ ...image, descriptions: { es: "Texto" } })
    const { wrapper } = await setup()
    const preview = wrapper.get(".image-preview img")
    expect(preview.attributes("alt")).toBeUndefined()
    expect(preview.attributes("title")).toBeUndefined()
  })

  it("offers the description editor for the image once it has loaded", async () => {
    const { wrapper } = await setup()
    expect(wrapper.getComponent(DescriptionEditor).props("imageId")).toBe("img-1")
    expect(useImagesStore().fetchDescriptions).not.toHaveBeenCalled()
  })

  it("loads the descriptions of the edited image with the real editor", async () => {
    vi.mocked(useImagesStore().fetchDescriptions).mockResolvedValue([
      { language: "en", source: "generated", text: "A harbour", updatedAt: "2026-11-16" }
    ])
    const { wrapper } = await setup(true)
    expect(useImagesStore().fetchDescriptions).toHaveBeenCalledExactlyOnceWith("img-1")
    expect(wrapper.get('[data-language="en"] textarea').element).toHaveProperty(
      "value",
      "A harbour"
    )
  })

  it("shows the reset action and enables save only with changes", async () => {
    const { wrapper } = await setup()
    wrapper.getComponent(MetadataEditor).vm.$emit("update", changedMetadata)
    await nextTick()
    let layout = useDashboardLayout()
    expect(layout.header.actions.map((action) => action.key)).toEqual(["reset"])
    expect(layout.header.actions[0]?.text).toBe("Reset")
    expect(footerAction("save").disabled).toBe(false)
    layout.header.actions[0]?.onClick()
    await nextTick()
    layout = useDashboardLayout()
    expect(layout.header.actions).toEqual([])
    expect(footerAction("save").disabled).toBe(true)
    expect(wrapper.getComponent(MetadataEditor).props("initialMetadata")).toEqual(initialMetadata)
  })

  it("saves changed metadata, navigates and toasts success", async () => {
    const { router, wrapper } = await setup()
    wrapper.getComponent(MetadataEditor).vm.$emit("update", changedMetadata)
    await nextTick()
    footerAction("save").onClick()
    await flushPromises()
    expect(useImagesStore().updateMetadata).toHaveBeenCalledOnce()
    expect(useImagesStore().updateMetadata).toHaveBeenCalledWith("img-1", changedMetadata)
    expect(toast).toHaveBeenCalledWith({
      description: "Image metadata updated successfully.",
      title: "Image Updated",
      type: "success"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/img-1")
  })

  it("toasts the failure when the save fails", async () => {
    const { router, wrapper } = await setup()
    vi.mocked(useImagesStore().updateMetadata).mockRejectedValue(new Error("boom"))
    wrapper.getComponent(MetadataEditor).vm.$emit("update", changedMetadata)
    await nextTick()
    footerAction("save").onClick()
    await flushPromises()
    expect(toast).toHaveBeenCalledWith({
      description: "boom",
      title: "Update Failed",
      type: "error"
    })
    expect(router.currentRoute.value.path).toBe("/dashboard/images/img-1/edit")
  })
})
