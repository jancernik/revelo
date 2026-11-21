import { mount, RouterLinkStub } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { reactive } from "vue"

import CollectionGrid from "#src/components/dashboard/CollectionGrid.vue"
import { gridCollection } from "#src/test/gridFixtures"

const controls = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("vue-router", () => ({ useRouter: () => ({ push: controls.push }) }))
const wrappers: ReturnType<typeof mount>[] = []
const render = (props: InstanceType<typeof CollectionGrid>["$props"]) => {
  const wrapper = mount(CollectionGrid, {
    global: { stubs: { Icon: true, RouterLink: RouterLinkStub } },
    props
  })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => vi.clearAllMocks())
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

describe("CollectionGrid", () => {
  it("limits short mode to three collections and links to all collections", async () => {
    const collections = Array.from({ length: 5 }, (_, i) => gridCollection(String(i)))
    const wrapper = render({ collections, shortGrid: true })
    expect(wrapper.findAll(".collection-item")).toHaveLength(3)
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/dashboard/collections")
    expect(wrapper.getComponent(RouterLinkStub).text()).toBe("View all")
    await wrapper.setProps({ shortGrid: false })
    expect(wrapper.findAll(".collection-item")).toHaveLength(5)
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })

  it("renders at most four thumbnails, exact counts and the untitled fallback", () => {
    const one = gridCollection("one")
    const many = { ...gridCollection("many", 6), title: null }
    const empty = { ...gridCollection("empty", 0), title: "" }
    const wrapper = render({ collections: [one, many, empty] })
    const items = wrapper.findAll(".collection-item")
    expect(items[0]?.findAll("img").map((img) => img.attributes("src"))).toEqual(["/thumb/one-0"])
    expect(items[1]?.findAll("img").map((img) => img.attributes("src"))).toEqual([
      "/thumb/many-0",
      "/thumb/many-1",
      "/thumb/many-2",
      "/thumb/many-3"
    ])
    expect(items[2]?.findAll("img")).toHaveLength(0)
    expect(wrapper.findAll(".image-count").map((row) => row.text())).toEqual([
      "1 image",
      "6 images",
      "0 images"
    ])
    expect(wrapper.findAll(".title").map((row) => row.text())).toEqual([
      "Title one",
      "Untitled",
      "Untitled"
    ])
    expect(items[0]?.get(".title").classes()).not.toContain("no-title")
    expect(items[1]?.get(".title").classes()).toContain("no-title")
  })

  it("renders a bare cached collection and updates when its images are hydrated", async () => {
    const { createdAt, description, id, title, updatedAt } = gridCollection("bare")
    const collection = { createdAt, description, id, title, updatedAt }
    const wrapper = render({ collections: [collection] })
    expect(wrapper.get(".title").text()).toBe("Title bare")
    expect(wrapper.get(".image-count").text()).toBe("0 images")
    expect(wrapper.findAll("img")).toHaveLength(0)
    await wrapper.setProps({ collections: [gridCollection("bare")] })
    expect(wrapper.get(".image-count").text()).toBe("1 image")
    expect(wrapper.get("img").attributes("src")).toBe("/thumb/bare-0")
  })

  it("navigates outside selection and emits action identities", async () => {
    const collection = reactive(gridCollection())
    const wrapper = render({ collections: [collection], showActions: true })
    await wrapper.get(".collection-container").trigger("click")
    expect(controls.push).toHaveBeenCalledWith(`/dashboard/collections/${collection.id}`)
    const actions = wrapper.findAll(".action-button")
    await actions[0]?.trigger("click")
    await actions[1]?.trigger("click")
    expect(wrapper.emitted("edit")?.[0]?.[0]).toBe(collection)
    expect(wrapper.emitted("delete")?.[0]?.[0]).toBe(collection)
  })

  it("selects with the original collection and event, hides actions while selecting", async () => {
    const collection = reactive(gridCollection())
    const wrapper = render({
      collections: [collection],
      selectedCollectionsIds: [collection.id],
      showActions: true
    })
    expect(wrapper.classes()).toContain("is-selecting")
    expect(wrapper.get(".collection-item").classes()).toContain("selected")
    expect(wrapper.find(".collection-actions").exists()).toBe(false)
    const event = new MouseEvent("click", { bubbles: true })
    wrapper.get(".select-button").element.dispatchEvent(event)
    expect(wrapper.emitted("select")?.[0]?.[0]).toBe(collection)
    expect(wrapper.emitted("select")?.[0]?.[1]).toBe(event)
    const containerEvent = new MouseEvent("click", { bubbles: true })
    wrapper.get(".collection-container").element.dispatchEvent(containerEvent)
    expect(wrapper.emitted("select")?.[1]?.[0]).toBe(collection)
    expect(wrapper.emitted("select")?.[1]?.[1]).toBe(containerEvent)
    expect(controls.push).not.toHaveBeenCalled()
    await wrapper.setProps({ allowSelect: false })
    expect(wrapper.classes()).not.toContain("is-selecting")
    expect(wrapper.get(".collection-item").classes()).not.toContain("selected")
    expect(wrapper.find(".select-button").exists()).toBe(false)
    expect(wrapper.find(".collection-actions").exists()).toBe(true)
    await wrapper.setProps({ fastSelect: true })
    expect(wrapper.classes()).toContain("is-selecting")
    expect(wrapper.find(".collection-actions").exists()).toBe(false)
    await wrapper.get(".collection-container").trigger("click")
    expect(wrapper.emitted("select")).toHaveLength(3)
  })
})
