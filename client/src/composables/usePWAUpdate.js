import { useRegisterSW } from "virtual:pwa-register/vue"

export function usePWAUpdate() {
  useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload()
    },
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        setInterval(
          () => {
            registration.update()
          },
          60 * 60 * 1000
        )
      }
    }
  })
}
