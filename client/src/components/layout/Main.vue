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
$transition: 0.4s cubic-bezier(0.86, 0, 0.07, 1);

#main {
  display: flex;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 100%;
  flex: 1 1 0;
  padding-right: 0 !important;
  transition: $transition;

  @include fill-parent;
  @include responsive-spacing;

  .main-inner {
    background-color: $white;
    overflow: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}
</style>
