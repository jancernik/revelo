import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

import type { DialogOptions } from "#src/composables/useDialog"

import InputSetting from "#src/components/dashboard/settings/InputSetting.vue"
import SwitchSetting from "#src/components/dashboard/settings/SwitchSetting.vue"
import TextPairsSetting from "#src/components/dashboard/settings/TextPairsSetting.vue"
import ToggleSetting from "#src/components/dashboard/settings/ToggleSetting.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { deferred, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"
import Settings from "#src/views/dashboard/Settings.vue"

const controls = vi.hoisted(() => ({
  dialog: vi.fn<(options: DialogOptions) => void>(),
  refresh: vi.fn()
}))
vi.mock("#src/composables/useSettings", () => ({
  useSettings: () => ({ refresh: controls.refresh })
}))
vi.mock("#src/composables/useDialog", () => ({ useDialog: () => ({ show: controls.dialog }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { delete: vi.fn(), get: vi.fn(), put: vi.fn() }
}))
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  useDashboardLayout().reset()
})
afterEach(() => vi.restoreAllMocks())

const definitions = () => [
  {
    category: "Zebra",
    default: false,
    description: "Toggle",
    name: "enabled",
    type: "toggle",
    value: true
  },
  {
    category: "Alpha",
    default: "Default",
    description: "Text",
    name: "title",
    type: "text",
    value: "Saved"
  },
  {
    category: "Alpha",
    default: 5,
    description: "Integer",
    name: "limit",
    type: "integer",
    value: 10
  },
  {
    category: "Alpha",
    default: 1.5,
    description: "Decimal",
    name: "ratio",
    type: "decimal",
    value: 2.5
  },
  {
    category: "Alpha",
    default: "legacy",
    description: "String alias",
    name: "alias",
    type: "string",
    value: "Single line"
  },
  {
    category: "Zebra",
    default: [],
    description: "Pairs",
    name: "pairs",
    type: "textpairs",
    value: [["a", "b"]]
  },
  {
    category: "Zebra",
    default: "one",
    description: "Mode",
    name: "mode",
    options: ["one", "two"],
    type: "switch",
    value: "one"
  },
  {
    category: "Zebra",
    default: { label: "First", value: "one" },
    description: "Object mode",
    name: "objectMode",
    options: [
      { label: "First", value: "one" },
      { label: "Second", value: "two" }
    ],
    type: "switch",
    value: { label: "First", value: "one" }
  },
  {
    category: "Alpha",
    default: "x",
    description: "Unsupported",
    name: "future",
    type: "future",
    value: "x"
  }
]

const setup = async () => {
  vi.mocked(api.get).mockResolvedValueOnce(success({ settings: definitions() }))
  const wrapper = mount(Settings, { global: { stubs: { Icon: true } } })
  await flushPromises()
  return wrapper
}
const footer = (key: string) => {
  const action = useDashboardLayout().footer.actions.find((item) => item.key === key)
  if (!action) throw new Error(`Missing footer action ${key}`)
  return action
}

describe("Settings", () => {
  it("fetches complete settings, sorts categories and dispatches all supported types and the fallback", async () => {
    const wrapper = await setup()
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/settings?complete=true")
    expect(useDashboardLayout().header.title).toBe("Settings")
    expect(wrapper.findAll(".category-header").map((item) => item.text())).toEqual([
      "Alpha",
      "Zebra"
    ])
    expect(
      wrapper.findAllComponents(InputSetting).map((item) => item.props("setting").name)
    ).toEqual(["title", "limit", "ratio", "alias"])
    expect(wrapper.findAllComponents(ToggleSetting)).toHaveLength(1)
    expect(wrapper.findAllComponents(TextPairsSetting)).toHaveLength(1)
    expect(wrapper.findAllComponents(SwitchSetting)).toHaveLength(2)
    expect(wrapper.get(".unknown-type").text()).toContain("Unsupported type: future")
    expect(useDashboardLayout().footer.actions).toEqual([])
    wrapper.unmount()
    expect(useDashboardLayout().header.title).toBeNull()
  })

  it("tracks a primitive edit, saves only that field and synchronizes the saved value", async () => {
    const wrapper = await setup()
    wrapper.getComponent(ToggleSetting).vm.$emit("update", false)
    await nextTick()
    expect(footer("save").text).toBe("Save 1 change")
    vi.mocked(api.put).mockResolvedValue(success({}))
    await footer("save").onClick()
    await flushPromises()
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/settings", {
      settings: [{ name: "enabled", value: false }]
    })
    expect(controls.refresh).toHaveBeenCalledOnce()
    expect(useDashboardLayout().footer.actions).toEqual([])
    expect(wrapper.getComponent(ToggleSetting).props("originalValue")).toBe(false)
    expect(wrapper.getComponent(ToggleSetting).props("currentValue")).toBe(false)
  })

  it("compares pair arrays and object values structurally, pluralizes and sends exact changed values", async () => {
    const wrapper = await setup()
    const pairs = wrapper.getComponent(TextPairsSetting)
    const mode = wrapper
      .findAllComponents(SwitchSetting)
      .find((item) => item.props("setting").name === "objectMode")
    if (!mode) throw new Error("Missing object mode")
    pairs.vm.$emit("update", [["a", "b"]])
    mode.vm.$emit("update", { label: "First", value: "one" })
    await nextTick()
    expect(useDashboardLayout().footer.actions).toEqual([])
    pairs.vm.$emit("update", [
      ["a", "changed"],
      ["c", "d"]
    ])
    mode.vm.$emit("update", { label: "Second", value: "two" })
    await nextTick()
    expect(footer("save").text).toBe("Save 2 changes")
    vi.mocked(api.put).mockResolvedValue(success({}))
    await footer("save").onClick()
    await flushPromises()
    expect(api.put).toHaveBeenCalledExactlyOnceWith("/settings", {
      settings: [
        {
          name: "pairs",
          value: [
            ["a", "changed"],
            ["c", "d"]
          ]
        },
        { name: "objectMode", value: { label: "Second", value: "two" } }
      ]
    })
    expect(useDashboardLayout().footer.actions).toEqual([])
  })

  it("cancels primitive, array and object drafts without changing saved values", async () => {
    const wrapper = await setup()
    const pairs = wrapper.getComponent(TextPairsSetting)
    const toggle = wrapper.getComponent(ToggleSetting)
    const mode = wrapper
      .findAllComponents(SwitchSetting)
      .find((item) => item.props("setting").name === "objectMode")
    if (!mode) throw new Error("Missing object mode")
    pairs.vm.$emit("update", [["changed", "b"]])
    toggle.vm.$emit("update", false)
    mode.vm.$emit("update", { label: "Second", value: "two" })
    await nextTick()
    expect(footer("save").text).toBe("Save 3 changes")
    footer("cancel").onClick()
    await nextTick()
    expect(toggle.props("currentValue")).toBe(true)
    expect(pairs.props("currentValue")).toEqual([["a", "b"]])
    expect(mode.props("currentValue")).toEqual({ label: "First", value: "one" })
    expect(useDashboardLayout().footer.actions).toEqual([])
    expect(api.put).not.toHaveBeenCalled()
  })

  it("resets an individual draft to its saved value", async () => {
    const wrapper = await setup()
    const input = wrapper
      .findAllComponents(InputSetting)
      .find((item) => item.props("setting").name === "title")
    if (!input) throw new Error("Missing title")
    input.vm.$emit("update", "Edited")
    await nextTick()
    expect(footer("save").text).toBe("Save 1 change")
    input.vm.$emit("reset")
    await nextTick()
    expect(input.props("currentValue")).toBe("Saved")
    expect(useDashboardLayout().footer.actions).toEqual([])
  })

  it("confirms reset-to-default, deletes the override and refreshes only after settling", async () => {
    const wrapper = await setup()
    const toggle = wrapper.getComponent(ToggleSetting)
    const pending = deferred<ReturnType<typeof success>>()
    vi.mocked(api.delete).mockReturnValueOnce(pending.promise)
    await toggle.get("button").trigger("click")
    expect(api.delete).not.toHaveBeenCalled()
    const callback = controls.dialog.mock.lastCall?.[0].actions?.[0]?.callback
    if (!callback) throw new Error("Missing default reset callback")
    callback()
    await nextTick()
    expect(api.delete).toHaveBeenCalledExactlyOnceWith("/settings/enabled")
    expect(toggle.props("isResetting")).toBe(true)
    expect(controls.refresh).not.toHaveBeenCalled()
    pending.resolve(success({}))
    await flushPromises()
    expect(toggle.props("currentValue")).toBe(false)
    expect(toggle.props("originalValue")).toBe(false)
    expect(toggle.props("isResetting")).toBe(false)
    expect(controls.refresh).toHaveBeenCalledOnce()
    expect(useDashboardLayout().footer.actions).toEqual([])
  })

  it("disables save/cancel while saving and refreshes even when save fails without losing drafts", async () => {
    const error = new Error("offline")
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = await setup()
    wrapper.getComponent(ToggleSetting).vm.$emit("update", false)
    await nextTick()
    let reject: (error: Error) => void = () => {}
    const pending = new Promise<ReturnType<typeof success>>((_resolve, rejectRequest) => {
      reject = rejectRequest
    })
    vi.mocked(api.put).mockReturnValueOnce(pending)
    const operation = footer("save").onClick()
    await nextTick()
    expect(footer("save").disabled).toBe(true)
    expect(footer("cancel").disabled).toBe(true)
    reject(error)
    await operation
    await flushPromises()
    expect(log).toHaveBeenCalledWith("Error saving settings:", error)
    expect(controls.refresh).toHaveBeenCalledOnce()
    expect(footer("save").disabled).toBe(false)
    expect(wrapper.getComponent(ToggleSetting).props("originalValue")).toBe(true)
    expect(wrapper.getComponent(ToggleSetting).props("currentValue")).toBe(false)
  })

  it("retains saved values after a failed default reset and clears its busy flag", async () => {
    const error = new Error("offline")
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapper = await setup()
    vi.mocked(api.delete).mockRejectedValueOnce(error)
    wrapper.getComponent(ToggleSetting).vm.$emit("reset-default")
    await flushPromises()
    expect(log).toHaveBeenCalledWith("Error resetting setting to default:", error)
    expect(wrapper.getComponent(ToggleSetting).props("originalValue")).toBe(true)
    expect(wrapper.getComponent(ToggleSetting).props("isResetting")).toBe(false)
    expect(controls.refresh).toHaveBeenCalledOnce()
  })

  it("finishes loading with empty settings when the response has no settings", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(success({}))
    const wrapper = mount(Settings, { global: { stubs: { Icon: true } } })
    await flushPromises()
    expect(wrapper.find(".settings").exists()).toBe(true)
    expect(wrapper.findAll(".section")).toHaveLength(0)
  })

  it("logs fetch failures and finishes loading without inventing settings", async () => {
    const error = new Error("offline")
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(api.get).mockRejectedValueOnce(error)
    const wrapper = mount(Settings, { global: { stubs: { Icon: true } } })
    await flushPromises()
    expect(log).toHaveBeenCalledWith("Error fetching settings:", error)
    expect(wrapper.find(".settings").exists()).toBe(true)
    expect(wrapper.findAll(".section")).toHaveLength(0)
  })
})
