import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDashboardLayout } from "#src/composables/useDashboardLayout"

beforeEach(() => {
  useDashboardLayout().reset()
  useDashboardLayout().closeMobileMenu()
})

afterEach(() => {
  useDashboardLayout().reset()
  useDashboardLayout().closeMobileMenu()
  vi.restoreAllMocks()
})

describe("useDashboardLayout", () => {
  it("shares state across calls and merges header changes", () => {
    const layout = useDashboardLayout()
    const action = { onClick: vi.fn(), text: "Save" }
    layout.setHeader({ actions: [action], subtitle: "Details", title: "First" })
    layout.setHeader({ title: "Second" })
    expect(useDashboardLayout().header).toBe(layout.header)
    expect(layout.header).toEqual({ actions: [action], subtitle: "Details", title: "Second" })
  })

  it("partially merges footer and selection configuration", () => {
    const layout = useDashboardLayout()
    const action = { onClick: vi.fn(), text: "Delete" }
    layout.setFooter({ actions: [action] })
    layout.setFooter({})
    layout.setSelection({ actions: [action], items: 2 })
    layout.setSelection({ items: 3 })
    expect(layout.footer.actions).toEqual([action])
    expect(layout.selection).toEqual({ actions: [action], items: 3 })
  })

  it("resets each section independently", () => {
    const layout = useDashboardLayout()
    const action = { onClick: vi.fn(), text: "Save" }
    layout.setHeader({ actions: [action], subtitle: "Details", title: "Title" })
    layout.setFooter({ actions: [action] })
    layout.setSelection({ actions: [action], items: 2 })
    layout.resetHeader()
    expect(layout.header).toEqual({ actions: [], subtitle: null, title: null })
    expect(layout.footer.actions).toEqual([action])
    expect(layout.selection.items).toBe(2)
    layout.resetFooter()
    expect(layout.footer).toEqual({ actions: [] })
    expect(layout.selection.items).toBe(2)
    layout.resetSelection()
    expect(layout.selection).toEqual({ actions: [], items: 0 })
  })

  it("resets all sections without changing the mobile menu", () => {
    const layout = useDashboardLayout()
    const action = { onClick: vi.fn(), text: "Save" }
    layout.setHeader({ actions: [action], title: "Title" })
    layout.setFooter({ actions: [action] })
    layout.setSelection({ actions: [action], items: 4 })
    layout.toggleMobileMenu()
    layout.reset()
    expect(layout.header).toEqual({ actions: [], subtitle: null, title: null })
    expect(layout.footer).toEqual({ actions: [] })
    expect(layout.selection).toEqual({ actions: [], items: 0 })
    expect(layout.mobileMenu.isOpen).toBe(true)
  })

  it("toggles and closes the mobile menu", () => {
    const layout = useDashboardLayout()
    layout.toggleMobileMenu()
    expect(layout.mobileMenu.isOpen).toBe(true)
    layout.toggleMobileMenu()
    expect(layout.mobileMenu.isOpen).toBe(false)
    layout.toggleMobileMenu()
    layout.closeMobileMenu()
    layout.closeMobileMenu()
    expect(layout.mobileMenu.isOpen).toBe(false)
  })

  it("exposes deeply readonly state that warns and rejects writes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const layout = useDashboardLayout()
    const action = { onClick: vi.fn(), text: "Save" }
    layout.setHeader({ actions: [action], title: "Title" })
    Reflect.set(layout.header, "title", "Changed")
    Reflect.set(layout.footer, "actions", [action])
    Reflect.set(layout.selection, "items", 3)
    Reflect.set(layout.mobileMenu, "isOpen", true)
    const readonlyAction = layout.header.actions[0]
    if (!readonlyAction) throw new Error("Expected header action")
    Reflect.set(readonlyAction, "text", "Changed")
    expect(layout.header.title).toBe("Title")
    expect(layout.header.actions).toEqual([expect.objectContaining({ text: "Save" })])
    expect(layout.footer.actions).toEqual([])
    expect(layout.selection.items).toBe(0)
    expect(layout.mobileMenu.isOpen).toBe(false)
    expect(warn).toHaveBeenCalled()
  })
})
