import { describe, expect, it } from "vitest"
import { ref } from "vue"

import { useRangeSelect } from "#src/composables/useRangeSelect"

const setup = () => {
  const items = ref(["a", "b", "c", "d", "e"].map((id) => ({ id })))
  const selectedIds = ref<string[]>([])
  const selection = useRangeSelect(items, selectedIds)
  const select = (id: string, shiftKey = false) => selection.handleSelect({ id }, { shiftKey })
  return { items, select, selectedIds, ...selection }
}

describe("useRangeSelect", () => {
  it("pushes single selections in place and reassigns on deselection", () => {
    const { select, selectedIds } = setup()
    const original = selectedIds.value
    select("b")
    expect(selectedIds.value).toBe(original)
    expect(selectedIds.value).toEqual(["b"])
    select("b")
    expect(selectedIds.value).not.toBe(original)
    expect(selectedIds.value).toEqual([])
  })

  it("supports a single selection without an event", () => {
    const { handleSelect, selectedIds } = setup()
    handleSelect({ id: "a" })
    expect(selectedIds.value).toEqual(["a"])
  })

  it("adds a shift range without duplicating selected ids or replacing the array", () => {
    const { select, selectedIds } = setup()
    selectedIds.value = ["c"]
    select("b")
    const original = selectedIds.value
    select("d", true)
    expect(selectedIds.value).toBe(original)
    expect(selectedIds.value).toEqual(["c", "b", "d"])
  })

  it("supports reversed ranges", () => {
    const { select, selectedIds } = setup()
    select("d")
    select("b", true)
    expect(selectedIds.value).toEqual(["d", "b", "c"])
  })

  it("deselects an all-selected range and preserves selections outside it", () => {
    const { select, selectedIds } = setup()
    select("b")
    selectedIds.value = ["a", "b", "c", "d", "e"]
    const original = selectedIds.value
    select("d", true)
    expect(selectedIds.value).not.toBe(original)
    expect(selectedIds.value).toEqual(["a", "e"])
  })

  it("keeps the original anchor across consecutive shift ranges", () => {
    const { select, selectedIds } = setup()
    select("b")
    select("e", true)
    select("c", true)
    expect(selectedIds.value).toEqual(["d", "e"])
  })

  it("falls back to a single toggle when the anchor no longer exists", () => {
    const { items, select, selectedIds } = setup()
    select("a")
    items.value = items.value.filter((item) => item.id !== "a")
    select("d", true)
    expect(selectedIds.value).toEqual(["a", "d"])
  })

  it("falls back to a single toggle when the target is not in the items", () => {
    const { select, selectedIds } = setup()
    select("a")
    select("outside", true)
    expect(selectedIds.value).toEqual(["a", "outside"])
  })

  it("clears the anchor without clearing the selection", () => {
    const { clearLastSelected, select, selectedIds } = setup()
    select("b")
    clearLastSelected()
    expect(selectedIds.value).toEqual(["b"])
    select("e", true)
    expect(selectedIds.value).toEqual(["b", "e"])
  })
})
