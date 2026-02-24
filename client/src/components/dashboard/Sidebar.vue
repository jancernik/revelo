<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useAuthStore } from "#src/stores/auth"
import { computed, reactive, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const LG_BREAKPOINT = 992

const { closeMobileMenu, mobileMenu, resetSelection } = useDashboardLayout()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { width } = useWindowSize()
const isMobile = computed(() => width.value < LG_BREAKPOINT)

watch(() => route.path, closeMobileMenu)
watch(isMobile, (mobile) => {
  if (!mobile) closeMobileMenu()
})

const sidebar = reactive({
  bottom: [
    {
      icon: "CheckSquare",
      key: "tasks",
      label: "Tasks",
      path: "/dashboard/tasks"
    },
    {
      icon: "Settings",
      key: "settings",
      label: "Settings",
      path: "/dashboard/settings"
    },
    {
      action: () => {
        authStore.logout().then(() => {
          router.push("/login")
        })
      },
      className: "logout",
      icon: "LogOut",
      key: "logout",
      label: "Logout"
    }
  ],
  top: [
    {
      icon: "Home",
      key: "gallery",
      label: "Gallery",
      path: "/"
    },
    {
      icon: "LayoutDashboard",
      key: "dashboard",
      label: "Dashboard",
      path: "/dashboard"
    },
    {
      icon: "Image",
      key: "images",
      label: "Images",
      path: "/dashboard/images"
    },
    {
      icon: "FolderOpen",
      key: "collections",
      label: "Collections",
      path: "/dashboard/collections"
    }
  ]
})

const handleItemClick = (item) => {
  resetSelection()
  if (item.action) {
    item.action()
  } else if (item.path) {
    router.push(item.path)
  }
}

const isActive = (path) => {
  if (!path) return false
  if (path === "/" || path === "/dashboard") {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}
</script>

<template>
  <Transition name="sidebar-backdrop">
    <div v-if="mobileMenu.isOpen" class="sidebar-backdrop" @click="closeMobileMenu" />
  </Transition>
  <aside class="dashboard-sidebar" :class="{ 'is-open': mobileMenu.isOpen }">
    <div class="sidebar-content">
      <ul class="top">
        <li v-for="item in sidebar.top" :key="item.key" :class="{ active: isActive(item.path) }">
          <button @click="handleItemClick(item)">
            <Icon :name="item.icon" size="16" />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>

      <ul class="bottom">
        <li v-for="item in sidebar.bottom" :key="item.key" :class="{ active: isActive(item.path) }">
          <button :class="item.className" @click="handleItemClick(item)">
            <Icon :name="item.icon" size="16" />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss">
.dashboard-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 16rem;
  background: var(--background);
  border-right: 1px solid var(--border);
  z-index: z(menu);

  .sidebar-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100vh;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .top {
    padding: var(--spacing-6) var(--spacing-4) var(--spacing-4);
  }

  .bottom {
    padding: var(--spacing-4);
    border-top: 1px solid var(--border);
    margin-top: var(--spacing-4);
  }

  li.active {
    background: var(--secondary);
    border-radius: var(--radius-md);
  }

  button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    color: var(--muted-foreground);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    gap: var(--spacing-2);
    @include text("sm");
    font-weight: var(--font-medium);
    transition: all 0.15s ease;

    .icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    &:hover {
      color: var(--foreground);
      background: var(--secondary-hover);

      .icon {
        opacity: 1;
      }
    }

    &.logout:hover {
      color: var(--danger);
      background: var(--danger-background);
    }
  }

  li.active button {
    color: var(--foreground);
    font-weight: var(--font-semibold);

    .icon {
      opacity: 1;
    }
  }

  transform: translateX(-100%);
  transition: transform 0.25s ease;

  &.is-open {
    transform: translateX(0);
    box-shadow: 0.5rem 0 2rem rgba(0, 0, 0, 0.15);
  }

  @include breakpoint("lg") {
    transform: none;
    transition: none;
    box-shadow: none;
  }
}

.sidebar-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  z-index: z(overlay);
  backdrop-filter: blur(2px);

  &.sidebar-backdrop-enter-active,
  &.sidebar-backdrop-leave-active {
    transition: opacity 0.3s ease-in-out;
  }

  &.sidebar-backdrop-enter-from,
  &.sidebar-backdrop-leave-to {
    opacity: 0;
  }
}
</style>
