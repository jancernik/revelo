<script setup>
import { LayoutPanelLeft, Library } from 'lucide-vue-next'

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
    <div class="sidebar-inner inner">
      <ul>
        <li class="current">
          <button>
            <LayoutPanelLeft />
            <div class="text">Home</div>
          </button>
          <span class="li-bg"></span>
        </li>
        <li>
          <button>
            <Library />
            <div class="text">Collections</div>
          </button>
          <span class="li-bg"></span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
$sidebar-width-expanded: 12rem;
$sidebar-width-collapsed: calc(44px + $md-spacing + calc($md-spacing / 2));
$transition: 0.4s cubic-bezier(0.86, 0, 0.07, 1);

button {
  background: none;
  padding: 10px;
  padding-block: 1.1rem;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1rem;
  gap: calc($md-spacing + calc($md-spacing/ 2));
}

.text {
  font-weight: 600;
}

ul {
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: $md-spacing;
  padding-left: $md-spacing;
  padding-block: calc($md-spacing * 2);
}

li {
  display: flex;
  position: relative;
}

li.current {
  &::before,
  &::after {
    content: '';
    position: absolute;
    left: -$md-spacing;
    height: calc($md-spacing * 2);
    width: calc($md-spacing * 2);
    background-color: $light-grey-1;
    transition: $transition;
    z-index: 2;
  }

  &::before {
    top: 100%;
    border-radius: $md-spacing 0 0 0;
  }

  &::after {
    top: calc($md-spacing * -2);
    border-radius: 0 0 0 $md-spacing;
  }

  .li-bg {
    position: absolute;
    height: 100%;
    border-radius: 0 calc($md-spacing * 0.7) calc($md-spacing * 0.7) 0;
    background-color: $white;
    left: -$md-spacing;
    top: 50%;
    transform: translateY(-50%);
    transition: $transition;
    z-index: -1;

    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 0;
      height: $md-spacing;
      width: $md-spacing;
      background-color: $white;
      z-index: -1;
    }

    &::before {
      top: 100%;
    }

    &::after {
      top: -$md-spacing;
    }
  }
}

.expanded {
  li.current {
    .li-bg {
      width: calc($sidebar-width-expanded - calc($md-spacing / 2));
    }
  }
}

.collapsed {
  li.current {
    &::before {
      border-radius: calc($md-spacing * 0.7) 0 0 0;
    }

    &::after {
      border-radius: 0 0 0 calc($md-spacing * 0.7);
    }
    .li-bg {
      width: $md-spacing;
    }
  }
}

#sidebar {
  position: fixed;
  transform: translate(0%);
  transition: $transition;
  width: 100%;
  height: 100%;
  z-index: 1000;
  padding-inline: 0 !important;
  @include responsive-spacing;

  .sidebar-inner {
    display: flex;
    align-items: center;
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
