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
  <div class="theme-toggler">
    <button
      ref="button"
      class="theme-toggler-button"
      :class="{ loading: isWaitingForGallery }"
      @click="toggleTheme"
    >
      <Icon v-if="isWaitingForGallery" name="Loader2" class="loading-icon" :size="18" />
      <Icon name="Zap" class="dark-icon" :size="18" />
      <Icon name="ZapOff" class="light-icon" :size="18" />
    </button>
  </div>
</template>

<style lang="scss">
.theme-toggler {
  .theme-toggler-button {
    @include flex-center;
    width: 2.75rem;
    height: 2.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--foreground);

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
