<script setup>
import Header from "#src/components/dashboard/Header.vue"
import Sidebar from "#src/components/dashboard/Sidebar.vue"
import { RouterView } from "vue-router"
</script>

<template>
  <div class="dashboard">
    <Sidebar />
    <div class="dashboard-main">
      <Header />
      <div class="dashboard-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style lang="scss"></style>
