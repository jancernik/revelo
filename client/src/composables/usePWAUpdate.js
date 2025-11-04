import { registerSW } from "virtual:pwa-register"

export function usePWAUpdate() {
  registerSW({ immediate: true })
}
