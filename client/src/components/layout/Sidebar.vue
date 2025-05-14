<script setup>
const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  },
  toggleSidebar: {
    type: Function,
    required: true
  },
  setSidebarState: {
    type: Function,
    required: true
  }
})

const handleMouseOver = () => {
  props.setSidebarState(true)
}

const handleMouseOut = () => {
  props.setSidebarState(false)
}
</script>

<template>
  <aside
    id="sidebar"
    :class="{ expanded: isExpanded, collapsed: !isExpanded }"
    @mouseover="handleMouseOver"
    @mouseout="handleMouseOut"
  >
    <div class="sidebar-inner inner">Sidebar</div>
  </aside>
</template>

<style lang="scss" scoped>
#sidebar {
  position: fixed;
  transform: translate(0%);
  transition: 0.3s ease-in-out;
  width: 100%;
  height: 100%;
  z-index: 1000;
  @include responsive-spacing;

  .sidebar-inner {
    @include flex-center;
  }

  &.collapsed {
    transform: translate(100%);
  }
  @media (min-width: $md) {
    position: static;
    width: $sidebar-width-expanded;
    &.collapsed {
      width: $sidebar-width-collapsed;
      transform: translate(0%);
    }
  }
}
</style>
