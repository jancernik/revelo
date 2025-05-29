<script setup>
import RButton from '@/components/RButton.vue'
import { useTheme } from '@/composables/useTheme'

const { setTheme, themeClass } = useTheme()

const toggleTheme = () => {
  setTheme(themeClass.value === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <RButton :icon="themeClass === 'dark' ? 'Sun' : 'Moon'" @click="toggleTheme"> </RButton>
</template>

<style lang="scss" scoped></style>
