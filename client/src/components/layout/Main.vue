<script setup>
import { RouterView } from 'vue-router'

defineProps({
  isSidebarExpanded: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <main id="main" :class="{ 'sidebar-expanded': isSidebarExpanded }">
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

  &.sidebar-expanded {
    padding: $md-spacing * 3;
  }

  .main-inner {
    @include flex-center;
    background-color: $white;
    overflow: auto;
  }
}
</style>
