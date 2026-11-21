import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"

import ImageCard from "#src/components/images/ImageCard.vue"
import { image } from "#src/stores/test/helpers"

const photo = image({
  descriptions: { en: "A harbour at dusk", es: "Un puerto" },
  versions: [
    { height: 12, path: "/tiny.jpg", size: 100, storageType: "local", type: "tiny", width: 16 },
    {
      height: 300,
      path: "/thumb.jpg",
      size: 1000,
      storageType: "local",
      type: "thumbnail",
      width: 400
    }
  ]
})
const render = (
  props: Partial<{ hasDragged: boolean; nativeLayout: boolean; shouldLoad: boolean }> = {},
  value = photo
) => mount(ImageCard, { props: { image: value, ...props } })

enableAutoUnmount(afterEach)

describe("ImageCard", () => {
  it("loads the tiny fallback before the thumbnail is requested and uses the English description", () => {
    const wrapper = render()
    expect(wrapper.attributes("data-flip-id")).toBe("img-image-1")
    expect(wrapper.attributes("tabindex")).toBe("-1")
    expect(wrapper.classes()).toContain("not-loaded")
    const thumbnail = wrapper.get(".thumbnail")
    const tiny = wrapper.get(".tiny-fallback")
    expect(thumbnail.attributes("src")).toBeUndefined()
    expect(thumbnail.attributes("style")).toContain("display: none")
    expect(thumbnail.attributes()).toMatchObject({
      alt: "A harbour at dusk",
      height: "300",
      title: "A harbour at dusk",
      width: "400"
    })
    expect(tiny.attributes()).toMatchObject({
      alt: "A harbour at dusk",
      height: "300",
      src: "/tiny.jpg",
      width: "400"
    })
  })

  it("emits tiny and thumbnail readiness and replaces the fallback after loading", async () => {
    const wrapper = render()
    await wrapper.get(".tiny-fallback").trigger("load")
    expect(wrapper.emitted("tinyLoad")).toEqual([[photo.id]])
    expect(wrapper.get(".tiny-fallback").classes()).toContain("loaded")
    await wrapper.setProps({ shouldLoad: true })
    expect(wrapper.classes()).not.toContain("not-loaded")
    expect(wrapper.get(".thumbnail").attributes("src")).toBe("/thumb.jpg")
    expect(wrapper.get(".thumbnail").attributes("style") ?? "").not.toContain("display: none")
    await wrapper.get(".thumbnail").trigger("load")
    expect(wrapper.emitted("load")).toEqual([[photo.id]])
    expect(wrapper.get(".thumbnail").classes()).toContain("loaded")
    expect(wrapper.get(".tiny-fallback").classes()).toContain("hidden")
  })

  it("counts tiny errors as ready without marking the tiny image loaded", async () => {
    const wrapper = render({ shouldLoad: true })
    await wrapper.get(".tiny-fallback").trigger("error")
    expect(wrapper.emitted("tinyLoad")).toEqual([[photo.id]])
    expect(wrapper.get(".tiny-fallback").classes()).not.toContain("loaded")
    expect(wrapper.classes()).not.toContain("not-loaded")
  })

  it("counts thumbnail errors as ready, keeps the fallback and retains the error after a load (quirk)", async () => {
    const wrapper = render({ shouldLoad: true })
    await wrapper.get(".tiny-fallback").trigger("load")
    await wrapper.get(".thumbnail").trigger("error")
    expect(wrapper.emitted("load")).toEqual([[photo.id]])
    expect(wrapper.classes()).toContain("not-loaded")
    expect(wrapper.get(".thumbnail").classes()).not.toContain("loaded")
    expect(wrapper.get(".tiny-fallback").classes()).not.toContain("hidden")
    await wrapper.get(".thumbnail").trigger("load")
    expect(wrapper.classes()).toContain("not-loaded")
    expect(wrapper.get(".tiny-fallback").classes()).toContain("hidden")
  })

  it("omits paths and English labels when versions and English descriptions are absent", () => {
    const wrapper = render({ shouldLoad: true }, image({ descriptions: { es: "Un puerto" } }))
    expect(wrapper.get(".thumbnail").attributes("src")).toBeUndefined()
    expect(wrapper.get(".thumbnail").attributes("alt")).toBeUndefined()
    expect(wrapper.get(".thumbnail").attributes("title")).toBeUndefined()
    expect(wrapper.get(".tiny-fallback").attributes("src")).toBeUndefined()
  })

  it("emits the original mouse event, image and flip id", async () => {
    const wrapper = render()
    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    wrapper.element.dispatchEvent(event)
    expect(wrapper.emitted("click")).toEqual([[event, photo, "img-image-1"]])
    expect(event.defaultPrevented).toBe(false)
  })

  it("prevents clicks and touch releases after a drag", () => {
    const wrapper = render({ hasDragged: true })
    for (const event of [
      new MouseEvent("click", { cancelable: true }),
      new TouchEvent("touchend", { cancelable: true })
    ]) {
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    expect(wrapper.emitted("click")).toBeUndefined()
  })

  it.each([false, true])(
    "emits touch release only for the non-native layout: native %s",
    (native) => {
      const wrapper = render({ nativeLayout: native })
      const event = new TouchEvent("touchend", { cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(wrapper.classes().includes("native-layout")).toBe(native)
      expect(wrapper.emitted("click")).toEqual(native ? undefined : [[event, photo, "img-image-1"]])
      expect(event.defaultPrevented).toBe(false)
    }
  )
})
