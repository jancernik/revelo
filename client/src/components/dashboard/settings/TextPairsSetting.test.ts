import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"

import type { TextPairs } from "#src/types/models"

import TextPairsSetting from "#src/components/dashboard/settings/TextPairsSetting.vue"

import { resetContract, settingInfo, track } from "./testFixtures"

const render = (
  currentValue: TextPairs,
  originalValue: TextPairs,
  defaultValue: TextPairs,
  isResetting = false
) =>
  track(
    mount(TextPairsSetting, {
      global: { stubs: { Icon: true } },
      props: {
        currentValue,
        isResetting,
        originalValue,
        setting: { ...settingInfo, default: defaultValue, type: "textpairs", value: originalValue }
      }
    })
  )

describe("TextPairsSetting", () => {
  resetContract<TextPairs>(render, [["saved", "value"]], [["changed", "value"]], [])

  it("renders the empty state, emits a new empty pair and edits it after the prop echo", async () => {
    const current: TextPairs = []
    const wrapper = render(current, [], [])
    expect(wrapper.get(".empty-state").text()).toBe("No pairs defined")
    expect(wrapper.findAll(".pair-item")).toHaveLength(0)
    await wrapper.get(".pairs-container > button").trigger("click")
    expect(wrapper.emitted("update")).toEqual([[[["", ""]]]])
    expect(wrapper.emitted("update")?.[0]?.[0]).not.toBe(current)
    expect(current).toEqual([])
    expect(wrapper.findAll("input")).toHaveLength(0)
    await wrapper.setProps({ currentValue: [["", ""]] })
    expect(wrapper.find(".empty-state").exists()).toBe(false)
    expect(wrapper.findAll("input").map((input) => input.attributes("placeholder"))).toEqual([
      "Replace",
      "With"
    ])
    await wrapper.get("button[title='Save pair']").trigger("click")
    expect(wrapper.findAll("input")).toHaveLength(0)
    expect(wrapper.get(".pair-key").text()).toBe("(empty)")
    expect(wrapper.get(".pair-value").text()).toBe("(empty)")
  })

  it("updates only the edited tuple without mutating either input reference", async () => {
    const current: TextPairs = [
      ["camera", "replacement"],
      ["lens", "other"]
    ]
    const wrapper = render(current, current, [])
    await wrapper.findAll("button[title='Edit pair']")[0].trigger("click")
    expect(wrapper.findAll("input").map((input) => input.element.value)).toEqual([
      "camera",
      "replacement"
    ])
    await wrapper.findAll("input")[0].setValue("new camera")
    const firstUpdate = wrapper.emitted("update")?.[0]?.[0]
    expect(firstUpdate).toEqual([
      ["new camera", "replacement"],
      ["lens", "other"]
    ])
    expect(firstUpdate).not.toBe(current)
    if (!Array.isArray(firstUpdate)) throw new Error("Expected emitted pairs")
    expect(firstUpdate[0]).not.toBe(current[0])
    expect(firstUpdate[1]).toBe(wrapper.props("currentValue")[1])
    await wrapper.findAll("input")[1].setValue("new replacement")
    expect(wrapper.emitted("update")?.[1]?.[0]).toEqual([
      ["camera", "new replacement"],
      ["lens", "other"]
    ])
    expect(current).toEqual([
      ["camera", "replacement"],
      ["lens", "other"]
    ])
    await wrapper.get("button[title='Save pair']").trigger("click")
    expect(wrapper.findAll("input")).toHaveLength(0)
    expect(wrapper.emitted("update")).toHaveLength(2)
  })

  it("removes immutably and stops editing when the old editing index is out of bounds", async () => {
    const current: TextPairs = [
      ["first", "1"],
      ["last", "2"]
    ]
    const wrapper = render(current, current, [])
    await wrapper.findAll("button[title='Edit pair']")[1].trigger("click")
    await wrapper.findAll("button[title='Delete pair']")[0].trigger("click")
    const emitted = wrapper.emitted("update")?.[0]?.[0]
    expect(emitted).toEqual([["last", "2"]])
    expect(emitted).not.toBe(current)
    if (!Array.isArray(emitted)) throw new Error("Expected emitted pairs")
    expect(emitted[0]).toBe(wrapper.props("currentValue")[1])
    expect(current).toHaveLength(2)
    expect(wrapper.findAll("input")).toHaveLength(0)
    await wrapper.setProps({ currentValue: [["last", "2"]] })
    expect(wrapper.findAll("input")).toHaveLength(0)
  })

  it("keeps the numeric editing index when an earlier removal leaves it in bounds", async () => {
    const current: TextPairs = [
      ["first", "1"],
      ["middle", "2"],
      ["last", "3"]
    ]
    const wrapper = render(current, current, [])
    await wrapper.findAll("button[title='Edit pair']")[1].trigger("click")
    await wrapper.findAll("button[title='Delete pair']")[0].trigger("click")
    await wrapper.setProps({
      currentValue: [
        ["middle", "2"],
        ["last", "3"]
      ]
    })
    expect(wrapper.findAll("input").map((input) => input.element.value)).toEqual(["last", "3"])
    await wrapper.get("button[title='Save pair']").trigger("click")
    expect(wrapper.findAll("input")).toHaveLength(0)
  })

  it("compares pair contents using JSON, including order and default equality", () => {
    expect(
      render([["a", "b"]], [["a", "b"]], [["a", "b"]])
        .find("button[title^='Reset']")
        .exists()
    ).toBe(false)
    expect(
      render([["b", "a"]], [["a", "b"]], [])
        .find("button[title$='saved value']")
        .exists()
    ).toBe(true)
    expect(
      render([["a", "b"]], [["a", "b"]], [["b", "a"]])
        .find("button[title$='default value']")
        .exists()
    ).toBe(true)
  })

  it("disables only add/reset while resetting, not edit, save or delete", async () => {
    const current: TextPairs = [["a", "b"]]
    const wrapper = render(current, [], [], true)
    expect(wrapper.get(".pairs-container > button").attributes("disabled")).toBeDefined()
    await wrapper.get(".pairs-container > button").trigger("click")
    expect(wrapper.emitted("update")).toBeUndefined()
    await wrapper.get("button[title='Edit pair']").trigger("click")
    expect(wrapper.get("button[title='Save pair']").attributes("disabled")).toBeUndefined()
    expect(wrapper.get("button[title='Delete pair']").attributes("disabled")).toBeUndefined()
    await wrapper.get("button[title='Delete pair']").trigger("click")
    expect(wrapper.emitted("update")).toEqual([[[]]])
    expect(wrapper.findAll("input")).toHaveLength(0)
  })
})
