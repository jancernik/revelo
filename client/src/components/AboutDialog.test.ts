import { enableAutoUnmount, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"

import AboutDialog from "#src/components/AboutDialog.vue"
import { useDialog } from "#src/composables/useDialog"

const settings = ref({ aboutDialogDescription: "About the photographs", aboutDialogTitle: "Hello" })
vi.mock("#src/composables/useSettings", () => ({ useSettings: () => ({ settings }) }))

enableAutoUnmount(afterEach)
beforeEach(() => {
  useDialog().hide()
  settings.value = { aboutDialogDescription: "About the photographs", aboutDialogTitle: "Hello" }
})
afterEach(() => useDialog().hide())

const render = () => mount(AboutDialog, { global: { stubs: { Icon: true } } })
const pointer = async (
  button: { element: Element },
  type: "pointerdown" | "pointerup",
  clientX = 40
) => {
  button.element.dispatchEvent(
    new PointerEvent(type, { clientX, clientY: 40, pointerId: 1, pointerType: "touch" })
  )
  await nextTick()
}

describe("AboutDialog", () => {
  it("opens the shared dialog with current settings and its close button", async () => {
    const wrapper = render()
    expect(wrapper.get("[name='CircleQuestionMark']").attributes("size")).toBe("18")
    await wrapper.get("button").trigger("click")
    expect(useDialog().dialogState).toMatchObject({
      description: "About the photographs",
      isOpen: true,
      title: "Hello",
      useX: true
    })
    useDialog().hide()
    settings.value = {
      aboutDialogDescription: "Updated content",
      aboutDialogTitle: "Updated title"
    }
    await wrapper.get("button").trigger("click")
    expect(useDialog().dialogState).toMatchObject({
      description: "Updated content",
      title: "Updated title"
    })
  })

  it("opens with empty content when the settings strings are empty", async () => {
    settings.value = { aboutDialogDescription: "", aboutDialogTitle: "" }
    await render().get("button").trigger("click")
    expect(useDialog().dialogState).toMatchObject({
      description: "",
      isOpen: true,
      title: "",
      useX: true
    })
  })

  it("opens on touch release and suppresses the synthetic click", async () => {
    const button = render().get("button")
    await pointer(button, "pointerdown")
    await pointer(button, "pointerup")
    expect(useDialog().dialogState.isOpen).toBe(true)
    useDialog().hide()
    await button.trigger("click")
    expect(useDialog().dialogState.isOpen).toBe(false)
    await button.trigger("click")
    expect(useDialog().dialogState.isOpen).toBe(true)
  })

  it("does not open for a dragged touch", async () => {
    const button = render().get("button")
    await pointer(button, "pointerdown")
    await pointer(button, "pointerup", 70)
    expect(useDialog().dialogState.isOpen).toBe(false)
  })
})
