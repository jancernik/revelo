import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"

import ImageMetadata from "#src/components/images/ImageMetadata.vue"
import { gridImage } from "#src/test/gridFixtures"

const wrappers: ReturnType<typeof mount>[] = []
const render = (image = gridImage()) => {
  const wrapper = mount(ImageMetadata, { global: { stubs: { Icon: true } }, props: { image } })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

describe("ImageMetadata", () => {
  it("hides empty groups and exposes its root element", () => {
    const wrapper = render()
    expect(wrapper.findAll(".metadata-group")).toHaveLength(0)
    expect(wrapper.vm.imageMetadata).toBe(wrapper.element)
  })

  it("shows camera and lens independently and updates group visibility", async () => {
    const wrapper = render({ ...gridImage(), camera: "Camera A" })
    expect(wrapper.findAll("h4").map((item) => item.text())).toEqual(["Camera"])
    expect(wrapper.findAll(".value").map((item) => item.text())).toEqual(["Camera A"])
    await wrapper.setProps({ image: { ...gridImage(), lens: "Lens B" } })
    expect(wrapper.findAll(".value").map((item) => item.text())).toEqual(["Lens B"])
    await wrapper.setProps({ image: gridImage() })
    expect(wrapper.findAll(".metadata-group")).toHaveLength(0)
  })

  it("formats all settings and the date without the timestamp", () => {
    const wrapper = render({
      ...gridImage(),
      aperture: "2.8",
      camera: "A",
      date: "2024-02-03T23:59:00Z",
      focalLength: "50",
      focalLengthEquivalent: "75",
      iso: 400,
      lens: "B",
      shutterSpeed: "0.004"
    })
    expect(wrapper.findAll("h4").map((item) => item.text())).toEqual([
      "Camera",
      "Settings",
      "Other"
    ])
    expect(wrapper.findAll(".value").map((item) => item.text())).toEqual([
      "A",
      "B",
      "f/2.8",
      "1/250",
      "400",
      "50mm",
      "75mm",
      "February 3, 2024"
    ])
  })

  it.each([
    ["1", "1s"],
    ["2.5", "2.5s"],
    ["0.3", "1/3"],
    ["0", "1/Infinity"],
    ["bad", "1/NaN"]
  ])("formats shutter %s as %s", (shutterSpeed, expected) => {
    const wrapper = render({ ...gridImage(), shutterSpeed })
    expect(wrapper.get(".value").text()).toBe(expected)
  })

  it.each(["aperture", "shutterSpeed", "iso", "focalLength", "focalLengthEquivalent"] as const)(
    "shows settings for %s alone",
    (field) => {
      const wrapper = render({ ...gridImage(), [field]: field === "iso" ? 100 : "1" })
      expect(wrapper.get("h4").text()).toBe("Settings")
      expect(wrapper.findAll(".metadata-item")).toHaveLength(1)
    }
  )

  it("hides a zero ISO and preserves invalid date formatting", () => {
    const wrapper = render({ ...gridImage(), date: "bad", iso: 0 })
    expect(wrapper.findAll("h4").map((item) => item.text())).toEqual(["Other"])
    expect(wrapper.get(".value").text()).toBe("Invalid Date")
  })
})
