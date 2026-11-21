import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import { reactive } from "vue"

import Input from "#src/components/common/Input.vue"
import MetadataEditor from "#src/components/dashboard/images/MetadataEditor.vue"
import { gridImage } from "#src/test/gridFixtures"

const defaults = {
  aperture: "",
  camera: "",
  comment: "",
  date: "",
  focalLength: "",
  focalLengthEquivalent: "",
  iso: "",
  lens: "",
  shutterSpeed: ""
}
const wrappers: ReturnType<typeof mount>[] = []
const render = (props: InstanceType<typeof MetadataEditor>["$props"]) => {
  const wrapper = mount(MetadataEditor, { global: { stubs: { Icon: true } }, props })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

const field = (wrapper: ReturnType<typeof render>, label: string) => {
  const input = wrapper.findAllComponents(Input).find((item) => item.props("label") === label)
  if (!input) throw new Error(`Missing input ${label}`)
  return input.get("input")
}

describe("MetadataEditor", () => {
  it("initializes defaults and numeric ISO without an initial update", async () => {
    const wrapper = render({ initialMetadata: { camera: "A", iso: 400 }, previewUrl: "/preview" })
    await flushPromises()
    expect(field(wrapper, "Camera").element.value).toBe("A")
    expect(field(wrapper, "ISO").element.value).toBe("400")
    expect(field(wrapper, "Lens").element.value).toBe("")
    expect(wrapper.emitted("update")).toBeUndefined()
    await field(wrapper, "Comment").setValue("note")
    expect(wrapper.emitted("update")).toEqual([
      [{ ...defaults, camera: "A", comment: "note", iso: "400" }]
    ])
    expect(wrapper.emitted("remove")).toBeUndefined()
  })

  it("retains nullable image fields and stringifies null ISO", async () => {
    const wrapper = render({ initialMetadata: gridImage(), previewUrl: "" })
    await flushPromises()
    expect(field(wrapper, "ISO").element.value).toBe("null")
    await field(wrapper, "Camera").setValue("Changed")
    expect(wrapper.emitted("update")?.[0]?.[0]).toEqual({
      aperture: null,
      camera: "Changed",
      comment: null,
      date: null,
      focalLength: null,
      focalLengthEquivalent: null,
      iso: "null",
      lens: null,
      shutterSpeed: null
    })
  })

  it("shows reset only after edits and restores the full initial object and shutter display", async () => {
    const wrapper = render({
      initialMetadata: { camera: "A", shutterSpeed: "0.004" },
      previewUrl: "",
      showHeader: true,
      showResetButton: true
    })
    await flushPromises()
    expect(wrapper.find(".reset").exists()).toBe(false)
    await field(wrapper, "Camera").setValue("B")
    expect(wrapper.find(".reset").exists()).toBe(true)
    await field(wrapper, "Shutter Speed").setValue("2")
    await field(wrapper, "Shutter Speed").trigger("blur")
    await wrapper.get(".reset").trigger("click")
    expect(field(wrapper, "Camera").element.value).toBe("A")
    expect(field(wrapper, "Shutter Speed").element.value).toBe("1/250")
    expect(wrapper.find(".reset").exists()).toBe(false)
    expect(wrapper.emitted("update")?.at(-1)).toEqual([
      { ...defaults, camera: "A", shutterSpeed: "0.004" }
    ])
  })

  it.each([
    ["1/125", "0.008", "1/125", "blur"],
    [" 2.5 ", "2.5", "2.5", "keydown.enter"],
    ["2/4", "0.5", "1/2", "keydown.enter"],
    ["bad", "", "", "blur"],
    ["1/0", "", "", "blur"],
    ["0", "0", "1/Infinity", "blur"],
    ["", "", "", "keydown.enter"]
  ])("converts %s on %s", async (display, decimal, normalized, event) => {
    const wrapper = render({ initialMetadata: { shutterSpeed: "1" }, previewUrl: "" })
    await flushPromises()
    expect(field(wrapper, "Shutter Speed").element.value).toBe("1")
    await field(wrapper, "Shutter Speed").setValue(display)
    expect(wrapper.emitted("update")).toBeUndefined()
    await field(wrapper, "Shutter Speed").trigger(event)
    expect(field(wrapper, "Shutter Speed").element.value).toBe(normalized)
    expect(wrapper.emitted("update")?.at(-1)).toEqual([{ ...defaults, shutterSpeed: decimal }])
  })

  it("toggles preview and header with filename and keeps reset hidden when disabled", async () => {
    const wrapper = render({
      initialMetadata: {},
      previewFilename: "photo.jpg",
      previewUrl: "/preview"
    })
    expect(wrapper.get("img").attributes()).toMatchObject({ alt: "photo.jpg", src: "/preview" })
    expect(wrapper.find(".metadata-editor-header").exists()).toBe(false)
    await wrapper.setProps({ showHeader: true, showPreview: false })
    expect(wrapper.classes()).toContain("has-header")
    expect(wrapper.get(".header-content p").text()).toBe("photo.jpg")
    expect(wrapper.find("img").exists()).toBe(false)
    await flushPromises()
    await field(wrapper, "Camera").setValue("B")
    expect(wrapper.find(".reset").exists()).toBe(false)
  })

  it("reinitializes on replacement and deep prop edits without emitting", async () => {
    const initialMetadata = reactive({ camera: "A", iso: 100 })
    const wrapper = render({
      initialMetadata,
      previewUrl: "",
      showHeader: true,
      showResetButton: true
    })
    await flushPromises()
    await field(wrapper, "Camera").setValue("edited")
    const count = wrapper.emitted("update")?.length
    initialMetadata.camera = "deep edit"
    await flushPromises()
    expect(field(wrapper, "Camera").element.value).toBe("deep edit")
    expect(wrapper.find(".reset").exists()).toBe(false)
    expect(wrapper.emitted("update")).toHaveLength(count ?? 0)
    await wrapper.setProps({ initialMetadata: { camera: "C", iso: 800, shutterSpeed: "0.5" } })
    await flushPromises()
    expect(field(wrapper, "Camera").element.value).toBe("C")
    expect(field(wrapper, "ISO").element.value).toBe("800")
    expect(field(wrapper, "Shutter Speed").element.value).toBe("1/2")
    expect(wrapper.find(".reset").exists()).toBe(false)
    expect(wrapper.emitted("update")).toHaveLength(count ?? 0)
  })
})
