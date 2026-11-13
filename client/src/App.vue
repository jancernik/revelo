<script setup>
import { onMounted, watch } from "vue"

import Dialog from "#src/components/common/Dialog.vue"
import Toast from "#src/components/common/Toast.vue"
import { useFavicon } from "#src/composables/useFavicon"
import { useTheme } from "#src/composables/useTheme"
import Main from "#src/layouts/Main.vue"

useFavicon()

const { themeClass } = useTheme()

const applyThemeToDocument = (theme) => {
  document.documentElement.classList.remove("light", "dark")
  if (theme) document.documentElement.classList.add(theme)
}

onMounted(() => applyThemeToDocument(themeClass.value))
watch(themeClass, applyThemeToDocument)
</script>

<template>
  <div class="app-container">
    <div class="app-content">
      <Main />
    </div>
    <Toast />
    <Dialog />
  </div>
</template>

<style lang="scss">
@use "#src/styles/app.scss" as *;
</style>
