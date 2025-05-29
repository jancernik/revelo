<script setup>
import Button from '@/components/common/Button.vue'
import { useTheme } from '@/composables/useTheme'

const { setTheme, themeClass } = useTheme()

const toggleTheme = () => {
  setTheme(themeClass.value === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <Button :icon="themeClass === 'dark' ? 'Sun' : 'Moon'" @click="toggleTheme"> </Button>
</template>

<style lang="scss" scoped></style>
