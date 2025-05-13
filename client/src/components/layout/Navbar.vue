<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

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
  <div class="nav-bar">
    <div class="nav-bar-left">
      <router-link to="/">Home</router-link>
    </div>
    <div class="nav-bar-right">
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
</template>

<style lang="scss" scoped></style>
