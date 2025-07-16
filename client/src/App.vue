<script setup>
import { onMounted, watch } from "vue"

import Dialog from "#src/components/common/Dialog.vue"
import FullscreenImage from "#src/components/common/FullscreenImage.vue"
import Toast from "#src/components/common/Toast.vue"
import DissolveMask from "#src/components/DissolveMask.vue"
import Main from "#src/components/layout/Main.vue"
import Menu from "#src/components/layout/Menu.vue"
import { useTheme } from "#src/composables/useTheme"

const { isAnimating, themeClass } = useTheme()

const applyThemeToDocument = (theme) => {
  if (!isAnimating.value) {
    document.body.classList.remove("light", "dark")
    if (theme) {
      document.body.classList.add(theme)
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
    <DissolveMask />
  </div>
</template>

<style lang="scss">
@use "#src/styles/app.scss" as *;
</style>
