<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <main id="main">
    <div class="main-inner inner">
      <RouterView />
    </div>
  </main>
</template>

<style lang="scss" scoped>
#main {
  display: flex;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 100%;
  flex: 1 1 0;
  padding-right: 0 !important;

  @include fill-parent;
  @include responsive-spacing;

  .main-inner {
    @include flex-center;
    background-color: $white;
  }
}
</style>
