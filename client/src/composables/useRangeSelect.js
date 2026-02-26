import { ref } from "vue"

export function useRangeSelect(items, selectedIds) {
  const lastSelectedId = ref(null)

  const selectRange = (rangeItems) => {
    const ids = rangeItems.map((i) => i.id)
    const allSelected = ids.every((id) => selectedIds.value.includes(id))

    if (allSelected) {
      selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id))
    } else {
      ids.forEach((id) => {
        if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
      })
    }
  }

  const handleSelect = (item, event) => {
    if (event?.shiftKey && lastSelectedId.value) {
      const startIndex = items.value.findIndex((i) => i.id === lastSelectedId.value)
      const endIndex = items.value.findIndex((i) => i.id === item.id)

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)
        selectRange(items.value.slice(start, end + 1))
        return
      }
    }

    lastSelectedId.value = item.id
    if (selectedIds.value.includes(item.id)) {
      selectedIds.value = selectedIds.value.filter((id) => id !== item.id)
    } else {
      selectedIds.value.push(item.id)
    }
  }

  const clearLastSelected = () => {
    lastSelectedId.value = null
  }

  return { clearLastSelected, handleSelect }
}
