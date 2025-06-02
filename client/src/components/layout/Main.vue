<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <main id="main">
    <div class="main-inner inner scrollable">
      <RouterView />
    </div>
  </main>
</template>

<style lang="scss">
#main {
  $transition: 0.4s cubic-bezier(0.86, 0, 0.07, 1);
  display: flex;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 100%;
  flex: 1 1 0;
  padding-right: 0 !important;
  transition: $transition;

  @include fill-parent;

  > .inner {
    @include fill-parent;
    gap: var(--spacing-1);
    border-radius: 0;
  }

  .main-inner {
    @include hide-scrollbar;
    background-color: var(--background);
    overflow: auto;
  }
}
</style>
