import { onUnmounted, ref } from "vue"

export function useFavicon() {
  const systemPrefersDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches)

  const updateFavicon = (prefersDark) => {
    let faviconLink = document.querySelector("link[rel~='icon']")
    if (!faviconLink) {
      faviconLink = document.createElement("link")
      faviconLink.rel = "icon"
      document.head.appendChild(faviconLink)
    }

    const faviconURL = prefersDark ? "images/favicon-dark.svg" : "images/favicon-light.svg"
    faviconLink.href = faviconURL
  }

  updateFavicon(systemPrefersDark.value)

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handleSystemChange = (event) => {
    systemPrefersDark.value = event.matches
    updateFavicon(event.matches)
  }

  mediaQuery.addEventListener("change", handleSystemChange)

  onUnmounted(() => {
    mediaQuery.removeEventListener("change", handleSystemChange)
  })
}
