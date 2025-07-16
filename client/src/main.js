import { createPinia } from "pinia"
import { createApp } from "vue"

import App from "#src/App.vue"
import router from "#src/router"
import { useSettingsStore } from "#src/stores/settings"

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()

settingsStore.initialize().then(() => {
  app.mount("#app")
})
