import { reactive, readonly } from "vue"

const footer = reactive({
  actions: []
})

const header = reactive({
  actions: [],
  subtitle: null,
  title: null
})

const selection = reactive({
  actions: [],
  items: 0
})

const mobileMenu = reactive({ isOpen: false })

export function useDashboardLayout() {
  const setHeader = (config) => {
    Object.assign(header, config)
  }

  const setFooter = (config) => {
    Object.assign(footer, config)
  }

  const setSelection = (config) => {
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
