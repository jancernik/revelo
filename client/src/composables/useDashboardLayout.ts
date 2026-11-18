import { reactive, readonly } from "vue"

import type { ButtonColor, IconName } from "#src/components/common/types"

export interface FooterState {
  actions: LayoutAction[]
}

export interface HeaderState extends FooterState {
  subtitle: null | string
  title: null | string
}

export interface LayoutAction {
  color?: ButtonColor
  disabled?: boolean
  icon?: IconName
  key?: string
  onClick: () => void
  text: string
}

export interface MobileMenuState {
  isOpen: boolean
}

export interface SelectionState extends FooterState {
  items: number
}

const footer = reactive<FooterState>({
  actions: []
})

const header = reactive<HeaderState>({
  actions: [],
  subtitle: null,
  title: null
})

const selection = reactive<SelectionState>({
  actions: [],
  items: 0
})

const mobileMenu = reactive<MobileMenuState>({ isOpen: false })

export function useDashboardLayout() {
  const setHeader = (config: Partial<HeaderState>) => {
    Object.assign(header, config)
  }

  const setFooter = (config: Partial<FooterState>) => {
    Object.assign(footer, config)
  }

  const setSelection = (config: Partial<SelectionState>) => {
    Object.assign(selection, config)
  }

  const resetHeader = () => {
    Object.assign(header, {
      actions: [],
      subtitle: null,
      title: null
    })
  }

  const resetFooter = () => {
    Object.assign(footer, {
      actions: []
    })
  }

  const resetSelection = () => {
    Object.assign(selection, {
      actions: [],
      items: 0
    })
  }

  const reset = () => {
    resetHeader()
    resetFooter()
    resetSelection()
  }

  const toggleMobileMenu = () => {
    mobileMenu.isOpen = !mobileMenu.isOpen
  }

  const closeMobileMenu = () => {
    mobileMenu.isOpen = false
  }

  return {
    closeMobileMenu,
    footer: readonly(footer),
    header: readonly(header),
    mobileMenu: readonly(mobileMenu),
    reset,
    resetFooter,
    resetHeader,
    resetSelection,
    selection: readonly(selection),
    setFooter,
    setHeader,
    setSelection,
    toggleMobileMenu
  }
}
