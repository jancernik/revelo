import App from "#src/App.vue"
import router from "#src/router"
import { useImagesStore } from "#src/stores/images"
import { useSettingsStore } from "#src/stores/settings"
import { createPinia } from "pinia"
import { createApp } from "vue"

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()
const imagesStore = useImagesStore()

settingsStore.initialize().then(() => app.mount("#app"))
imagesStore.initialize()
