<script setup>
import Header from '@/components/layout/Header.vue'
import Menu from '@/components/layout/Menu.vue'
import Footer from '@/components/layout/Footer.vue'
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
      <Header />
      <Main />
      <Footer />
    </div>
    <Menu />
    <Toast />
    <Dialog />
  </div>
</template>

<style lang="scss">
@use '@/styles/app.scss';
</style>
