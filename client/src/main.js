import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { useSettingsStore } from '@/stores/settings'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()

settingsStore.initialize().then(() => {
  app.mount('#app')
})
