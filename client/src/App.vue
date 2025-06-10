<script setup>
import Menu from '@/components/layout/Menu.vue'
import Main from '@/components/layout/Main.vue'
import Dialog from '@/components/common/Dialog.vue'
import Toast from '@/components/common/Toast.vue'
import { useTheme } from '@/composables/useTheme'
import { onMounted, watch } from 'vue'

const { themeClass, isAnimating } = useTheme()

const applyThemeToDocument = (theme) => {
  if (!isAnimating.value) {
    document.body.classList.remove('light', 'dark')
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
  </div>
</template>

<style lang="scss">
@use '@/styles/app.scss';
</style>
