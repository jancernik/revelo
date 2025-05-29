<script setup>
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Footer from '@/components/layout/Footer.vue'
import Main from '@/components/layout/Main.vue'
import Dialog from '@/components/common/Dialog.vue'
import Toast from '@/components/common/Toast.vue'
import { useTheme } from '@/composables/useTheme'
import { onMounted, watch } from 'vue'

const { themeClass } = useTheme()

const applyThemeToDocument = (theme) => {
  document.documentElement.classList.remove('light', 'dark')
  if (theme) {
    document.documentElement.classList.add(theme)
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
    <Sidebar />
    <Toast />
    <Dialog />
  </div>
</template>

<style lang="scss">
@use '@/styles/app.scss';
</style>
