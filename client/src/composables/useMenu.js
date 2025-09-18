import { ref, useTemplateRef } from 'vue'

/**
 * Composable for managing menu visibility and animations
 * Provides a clean API to show/hide menu components
 */
export function useMenu(menuRefName = 'menu') {
  const menuRef = useTemplateRef(menuRefName)
  const isVisible = ref(true)

  const showMenu = () => {
    if (menuRef.value?.showMenu) {
      menuRef.value.showMenu()
      isVisible.value = true
    }
  }

  const hideMenu = () => {
    if (menuRef.value?.hideMenu) {
      menuRef.value.hideMenu()
      isVisible.value = false
    }
  }

  const toggleMenu = () => {
    if (menuRef.value?.toggleMenu) {
      menuRef.value.toggleMenu()
      isVisible.value = menuRef.value.isVisible?.() ?? !isVisible.value
    }
  }

  const getMenuVisibility = () => {
    return menuRef.value?.isVisible?.() ?? isVisible.value
  }

  return {
    menuRef,
    isVisible,
    showMenu,
    hideMenu,
    toggleMenu,
    getMenuVisibility
  }
}