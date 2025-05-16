<script setup>
import Header from '@/components/layout/Header.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Footer from '@/components/layout/Footer.vue'
import Main from './components/layout/Main.vue'
import { ref } from 'vue'

const isSidebarExpanded = ref(false)
const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value
}

const setSidebarState = (state) => {
  isSidebarExpanded.value = state
}
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
</template>

<style lang="scss">
@use '@/styles/app.scss';
</style>
