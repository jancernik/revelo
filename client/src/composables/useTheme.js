import { computed, ref } from "vue"

const theme = ref(localStorage.getItem("theme") || "system")
const systemPrefersDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches)

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
  systemPrefersDark.value = event.matches
})

export function useTheme() {
  const themeClass = computed(() =>
    theme.value !== "system" ? theme.value : systemPrefersDark.value ? "dark" : "light"
  )

  const setTheme = (value) => {
    theme.value = value
    localStorage.setItem("theme", value)
  }

  return { setTheme, theme, themeClass }
}
