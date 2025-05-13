<script setup>
import { RouterView } from 'vue-router'
import Navbar from '@/components/layout/Navbar.vue'
</script>

<template>
  <Navbar />
  <div class="main-container">
    <RouterView />
  </div>
</template>

<style lang="scss">
@import '@/scss/app.scss';
</style>
