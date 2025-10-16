<script setup>
import Dialog from "#src/components/common/Dialog.vue"
import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import Toast from "#src/components/common/Toast.vue"
import Menu from "#src/components/Menu.vue"
import { useTheme } from "#src/composables/useTheme"
import Main from "#src/layouts/Main.vue"
import { onMounted, watch } from "vue"

const { isAnimating, themeClass } = useTheme()

const applyThemeToDocument = (theme) => {
  if (!isAnimating.value) {
    document.documentElement.classList.remove("light", "dark")
    if (theme) {
      document.documentElement.classList.add(theme)
    }
  }
}

onMounted(() => applyThemeToDocument(themeClass.value))
watch(themeClass, (newTheme) => applyThemeToDocument(newTheme))
</script>

<template>
  <div class="app-container">
    <div class="app-content">
      <Main />
    </div>
    <Menu />
    <Toast />
    <Dialog />
    <FullscreenImage />
  </div>
</template>

<style lang="scss">
@use "#src/styles/app.scss" as *;
</style>
