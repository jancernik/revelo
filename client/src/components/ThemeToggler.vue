<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useTheme } from "#src/composables/useTheme"
import { useTemplateRef } from "vue"

const { isWaitingForGallery, setTheme, themeClass } = useTheme()
const button = useTemplateRef("button")

const toggleTheme = () => {
  if (isWaitingForGallery.value) return

  const rect = button.value.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const newTheme = themeClass.value === "dark" ? "light" : "dark"
  setTheme(newTheme, { origin: { x, y } })
}
</script>

<template>
  <button
    ref="button"
    class="theme-toggler"
    :class="{ loading: isWaitingForGallery }"
    @click="toggleTheme"
  >
    <Icon v-if="isWaitingForGallery" name="Loader2" class="loading-icon" />
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

  .loading-icon {
    animation: spin 1s linear infinite;
  }

  &.loading {
    cursor: wait;
    .light-icon,
    .dark-icon {
      display: none !important;
    }
  }
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
