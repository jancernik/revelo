import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useToast } from "#src/composables/useToast"

beforeEach(() => {
  vi.useFakeTimers()
  useToast().clear()
})

afterEach(() => {
  useToast().clear()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("useToast", () => {
  it("provides the default toast fields", () => {
    const { show, toastState } = useToast()
    const id = show()
    expect(toastState.toasts).toEqual([
      {
        action: null,
        description: "",
        dismissible: true,
        duration: 4,
        id,
        showIcon: true,
        title: "",
        type: "info"
      }
    ])
  })

  it("retains supplied options without running the action", () => {
    const callback = vi.fn()
    const { show, toastState } = useToast()
    const id = show({
      action: { callback, color: "primary", icon: "Undo", name: "Undo" },
      description: "Saved changes",
      dismissible: false,
      duration: 2,
      showIcon: false,
      title: "Saved",
      type: "success"
    })
    expect(toastState.toasts[0]).toEqual({
      action: { callback, color: "primary", icon: "Undo", name: "Undo" },
      description: "Saved changes",
      dismissible: false,
      duration: 2,
      id,
      showIcon: false,
      title: "Saved",
      type: "success"
    })
    expect(callback).not.toHaveBeenCalled()
  })

  it("shares state and keeps incrementing ids across instances and clear", () => {
    const first = useToast()
    const second = useToast()
    expect(second.toastState).toBe(first.toastState)
    const id = first.show()
    expect(second.show()).toBe(id + 1)
    first.clear()
    expect(second.show()).toBe(id + 2)
  })

  it("automatically removes each toast after its duration in seconds", () => {
    const { show, toastState } = useToast()
    show({ duration: 1 })
    const later = show({ duration: 2 })
    vi.advanceTimersByTime(999)
    expect(toastState.toasts).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(toastState.toasts).toEqual([expect.objectContaining({ id: later })])
    vi.advanceTimersByTime(1000)
    expect(toastState.toasts).toEqual([])
  })

  it("does not automatically remove a toast with duration zero", () => {
    const { show, toastState } = useToast()
    const id = show({ duration: 0 })
    vi.advanceTimersByTime(60_000)
    expect(toastState.toasts).toEqual([expect.objectContaining({ id })])
  })

  it("removes only the matching id and ignores unknown ids", () => {
    const { remove, show, toastState } = useToast()
    const first = show()
    const second = show()
    remove(second + 100)
    expect(toastState.toasts).toEqual([
      expect.objectContaining({ id: first }),
      expect.objectContaining({ id: second })
    ])
    remove(first)
    expect(toastState.toasts).toEqual([expect.objectContaining({ id: second })])
  })

  it("clears all toasts", () => {
    const { clear, show, toastState } = useToast()
    show()
    show()
    clear()
    expect(toastState.toasts).toEqual([])
  })
})
