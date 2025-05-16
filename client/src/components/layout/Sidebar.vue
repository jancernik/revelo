<script setup>
import { LayoutPanelLeft, Library, Shield, LogOut } from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

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

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const handleMouseOver = () => {
  props.setSidebarState(true)
}

const handleMouseOut = () => {
  props.setSidebarState(false)
}

const isLoggedIn = computed(() => authStore && !!authStore.user)
const isAdmin = computed(() => authStore && !!authStore.user?.admin)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const navigateTo = (path) => {
  router.push(path)
}

const isActive = (path) => {
  return route && route.path === path
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
        <!-- Home -->
        <li :class="{ active: isActive('/') }">
          <div class="btn-wrapper">
            <button @click="navigateTo('/')">
              <LayoutPanelLeft />
              <span class="text">Home</span>
            </button>
          </div>
          <div class="li-bg"></div>
        </li>

        <li :class="{ active: isActive('/collections') }">
          <div class="btn-wrapper">
            <button @click="navigateTo('/collections')">
              <Library />
              <span class="text">Collections</span>
            </button>
          </div>
          <div class="li-bg"></div>
        </li>

        <li v-if="isAdmin" :class="{ active: isActive('/dashboard') }">
          <div class="btn-wrapper">
            <button @click="navigateTo('/dashboard')">
              <Shield />
              <span class="text">Dashboard</span>
            </button>
          </div>
          <div class="li-bg"></div>
        </li>

        <li v-if="isLoggedIn">
          <div class="btn-wrapper">
            <button class="logout" @click="handleLogout">
              <LogOut />
              <span class="text">Log out</span>
            </button>
          </div>
          <div class="li-bg"></div>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
$sidebar-width-expanded: 11rem + calc($md-spacing / 2);
$sidebar-width-collapsed: calc(44px + $md-spacing + calc($md-spacing * 1.5));
$transition: 0.4s cubic-bezier(0.86, 0, 0.07, 1);
$transition-hover: 0s linear;

button {
  background: none;
  padding: 10px;
  padding-block: 1.1rem;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-size: 1rem;
  gap: calc($md-spacing * 2);
  transition: gap $transition;
  width: $sidebar-width-expanded;

  span, svg {
    font-weight: 600;
    white-space: nowrap;
    z-index: 5;
  }
}

ul {
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: $md-spacing*0;
  padding-left: $md-spacing;
  padding-block: calc($md-spacing * 2);

  li {
    display: flex;
    position: relative;
  }
}

li {
  .li-bg {
    pointer-events: none;
    position: absolute;
    height: 100%;
    left: -$md-spacing;
    top: 50%;
    transform: translateY(-50%);
    transition: all $transition, background-color $transition-hover;
    width: calc($sidebar-width-collapsed - calc($md-spacing / 2));
    width: $md-spacing;
    border-radius: 0px 80% 80% 0px / 0px 20% 20% 0px;

    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 0;
      height: $md-spacing;
      width: $md-spacing;
      z-index: 2;
      transition: all $transition, background-color $transition-hover;
    }

    &::before {
      top: 100%;
      border-radius: $md-spacing 0 0 0 ;
      border-radius: 40% 0px 0px 0px  / 80% 0px 0px 0px ;
    }

    &::after {
      top: calc($md-spacing * -1);
      border-radius: 0px 0px 0px 40% / 0px 0px 0px 80%;
    }
  }

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: -$md-spacing;
    height: $md-spacing;
    width: $md-spacing;
    transition: all $transition, background-color $transition-hover;
    z-index:-1;
  }

  &::before {
    top: 100%;
  }

  &::after {
    top: -$md-spacing;
  }

  &:hover {
    .li-bg {
      background-color: $light-grey-2;

      &::before,
      &::after {
        background-color: $light-grey-1;
      }
    }

    &::before,
    &::after {
      background-color: $light-grey-2;
    }
  }

  &.active {
    z-index: 3;

    .li-bg {
      background-color: $white;

      &::before,
      &::after {
        background-color: $light-grey-1;
      }
    }

    &::before,
    &::after {
      background-color: $white;
    }
  }
}

li {
  &.active + li {
    &::after {
      display: none;
    }
  }

  &:has(+ li.active) {
    &::before {
      display: none;
    }
  }

  &:not(.active):hover + li {
    .li-bg::after {
      background-color: $light-grey-2;
    }
  }

  &:has(+ li:hover:not(.active)) {
    .li-bg::before {
      background-color: $light-grey-2;
    }
  }
}

.expanded {
  button {
    gap: $md-spacing;
  }

  li {
    .li-bg {
      width: calc($sidebar-width-expanded - calc($md-spacing / 2));
      border-radius: 0 $md-spacing $md-spacing 0;

      &::after {
        border-radius: 0 0 0 $md-spacing;
      }

      &::before {
        border-radius: $md-spacing 0 0 0;
      }
    }
  }
}

#sidebar {
  position: fixed;
  transform: translate(0%);
  transition: $transition;
  width: 100%;
  height: 100%;
  padding-inline: 0 !important;
  @include responsive-spacing;

  .sidebar-inner {
    display: flex;
    align-items: center;
    padding-right: calc($md-spacing/2);
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
