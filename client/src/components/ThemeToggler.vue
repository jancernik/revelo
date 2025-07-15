<script setup>
import { useTemplateRef } from "vue"

import Icon from "@/components/common/Icon.vue"
import { useTheme } from "@/composables/useTheme"

const { setTheme, themeClass } = useTheme()
const button = useTemplateRef("button")

const toggleTheme = () => {
  const rect = button.value.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const newTheme = themeClass.value === "dark" ? "light" : "dark"
  setTheme(newTheme, { origin: { x, y } })
}
</script>

<template>
  <button ref="button" class="theme-toggler" @click="toggleTheme">
    <Icon name="Zap" class="dark-icon" />
    <Icon name="ZapOff" class="light-icon" />
  </button>
</template>

<style lang="scss">
.theme-toggler {
  @include flex-center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  .light-icon {
    @include light-dark-property(display, block, none);
  }

  .dark-icon {
    @include light-dark-property(display, none, block);
  }
}
</style>
