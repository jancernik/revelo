import { ref, computed, onMounted, onUnmounted } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'system')
const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

export function useTheme() {
  const themeClass = computed(() => {
    if (theme.value !== 'system') {
      return theme.value
    }

    return systemPrefersDark.value ? 'dark' : 'light'
  })

  const setTheme = (newTheme) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleSystemChange = (event) => {
    systemPrefersDark.value = event.matches
  }

  onMounted(() => {
    mediaQuery.addEventListener('change', handleSystemChange)
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemChange)
  })

  return {
    theme,
    themeClass,
    setTheme
  }
}
