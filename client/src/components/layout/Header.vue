<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps({
  toggleSidebar: {
    type: Function,
    required: true
  }
})

const authStore = useAuthStore()

const showMenu = ref(false)

const isLoggedIn = computed(() => !!authStore.user)
const isAdmin = computed(() => !!authStore.user?.admin)

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const handleLogout = async () => {
  await authStore.logout()
  showMenu.value = false
}
</script>

<template>
  <header id="header">
    <div class="header-inner inner">
      <button @click="toggleSidebar">Toggle Sidebar</button>

      <div class="navbar-left">
        <router-link to="/">Home</router-link>
      </div>
      <div class="navbar-right">
        <button class="menu-button" @click="toggleMenu">Menu</button>
        <div v-if="showMenu" class="menu-dropdown">
          <div class="menu-items">
            <div v-if="isLoggedIn">
              <router-link v-if="isAdmin" to="/dashboard" class="menu-item">Dashboard</router-link>
              <button class="menu-item logout-button" @click="handleLogout">Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
#header {
  height: $footer-height;
  display: none;
  @include responsive-spacing;

  .header-inner {
    @include flex-center;
    background-color: $white;
  }
}
</style>
