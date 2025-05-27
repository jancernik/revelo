<script setup>
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Footer from '@/components/layout/Footer.vue'
import Main from '@/components/layout/Main.vue'
import RDialog from '@/components/RDialog.vue'
import RToast from '@/components/RToast.vue'
import { useTheme } from '@/composables/useTheme'
import { ref, onMounted, watch } from 'vue'

const { themeClass } = useTheme()
const isSidebarExpanded = ref(false)

const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value
}

const setSidebarState = (state) => {
  isSidebarExpanded.value = state
}

const applyThemeToDocument = (theme) => {
  document.documentElement.classList.remove('light', 'dark')
  if (theme) {
    document.documentElement.classList.add(theme)
  }
}

onMounted(() => {
  applyThemeToDocument(themeClass.value)
})

watch(themeClass, (newTheme) => {
  applyThemeToDocument(newTheme)
})
</script>

<template>
  <div id="app-container">
    <Header :toggle-sidebar="toggleSidebar" />
    <Main :is-sidebar-expanded="isSidebarExpanded" />
    <Footer />
  </div>
  <Sidebar
    :is-expanded="isSidebarExpanded"
    :toggle-sidebar="toggleSidebar"
    :set-sidebar-state="setSidebarState"
  />
  <RToast />
  <RDialog />
</template>

<style lang="scss">
@use '@/styles/app.scss';
</style>
