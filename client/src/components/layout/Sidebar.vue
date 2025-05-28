<script setup>
import { computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import RIcon from '@/components/RIcon.vue'
import { useSettings } from '@/composables/useSettings'

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

const sidebarConfig = reactive([
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
    visible: () => isLoggedIn.value,
    action: handleLogout,
    className: 'logout'
  }
])

const visibleSidebarItems = computed(() => {
  return sidebarConfig.filter((item) => {
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
  <aside :class="['sidebar', settings.sidebarPosition]">
    <div class="sidebar-inner inner">
      <ul>
        <li
          v-for="item in visibleSidebarItems"
          :key="item.id"
          :class="{ active: isActive(item.path) }"
        >
          <div class="list-item">
            <button :class="item.className" @click="handleItemClick(item)">
              <RIcon :name="item.icon" />
              <span class="text">{{ item.label }}</span>
            </button>
          </div>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  &.right {
    order: 0;
  }
  &.left {
    order: -1;
  }
}
ul {
  list-style: none;
}
li.active {
  background-color: #fff;
}

button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1rem;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
}
</style>
