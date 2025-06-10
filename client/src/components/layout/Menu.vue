<script setup>
import { computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { useSettings } from '@/composables/useSettings'
import ThemeToggler from '@/components/ThemeToggler.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { settings } = useSettings()
const isLoggedIn = computed(() => authStore && !!authStore.user)
const isAdmin = computed(() => authStore && !!authStore.user?.admin)

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}

const menuConfig = reactive([
  {
    id: 'home',
    label: 'Home',
    icon: 'LayoutPanelLeft',
    path: '/',
    visible: true
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: 'Library',
    path: '/collections',
    visible: true
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'Shield',
    path: '/dashboard',
    visible: () => isAdmin.value
  },
  {
    id: 'login',
    label: 'Login',
    icon: 'LogIn',
    path: '/login',
    visible: () => !isLoggedIn.value && settings.value.showLoginLink
  },
  {
    id: 'logout',
    label: 'Log out',
    icon: 'LogOut',
    // visible: () => isLoggedIn.value,
    visible: false,
    action: handleLogout,
    className: 'logout'
  }
])

const visibleMenuItems = computed(() => {
  return menuConfig.filter((item) => {
    if (typeof item.visible === 'function') {
      return item.visible()
    }
    return item.visible
  })
})

const handleItemClick = (item) => {
  if (item.action) {
    item.action()
  } else if (item.path) {
    router.push(item.path)
  }
}

const isActive = (path) => {
  if (!path) return false
  if (path === '/') {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}
</script>

<template>
  <aside class="menu">
    <div class="menu-inner inner">
      <ul>
        <li
          v-for="item in visibleMenuItems"
          :key="item.id"
          :class="{ active: isActive(item.path) }"
        >
          <div class="list-item">
            <button :class="item.className" @click="handleItemClick(item)">
              <span class="text">{{ item.label }}</span>
            </button>
          </div>
        </li>
        <li class="theme">
          <ThemeToggler />
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss">
.menu {
  @include flex-center;
  background-color: var(--menu-background);
  position: fixed;
  bottom: var(--spacing-4);
  border-radius: calc(var(--radius-md) + var(--spacing-2));
  .theme {
    @include flex-center;
  }
  ul {
    list-style: none;
    display: flex;
    padding: var(--spacing-2);
  }

  li {
    border-radius: var(--radius-md);
  }

  li.active {
    background-color: var(--background);
  }

  button {
    border: none;
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-3) var(--spacing-6);
    background: none;
    cursor: pointer;
    color: inherit;
    @include text('base');
    font-weight: var(--font-normal);
    text-transform: uppercase;
  }
}
</style>
