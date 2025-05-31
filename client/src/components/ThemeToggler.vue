<script setup>
import { useTemplateRef } from 'vue'
import { useTheme } from '@/composables/useTheme'
import Icon from '@/components/common/Icon.vue'

const { setTheme, themeClass } = useTheme()
const button = useTemplateRef('button')

const toggleTheme = () => {
  const rect = button.value.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const newTheme = themeClass.value === 'dark' ? 'light' : 'dark'
  setTheme(newTheme, { origin: { x, y } })
}
</script>

<template>
  <button ref="button" @click="toggleTheme">
    <Icon name="Zap" class="dark-icon" />
    <Icon name="ZapOff" class="light-icon" />
  </button>
</template>

<style lang="scss" scoped>
button {
  @include flex-center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  .light & {
    .light-icon {
      display: block;
    }
    .dark-icon {
      display: none;
    }
  }
  .dark & {
    .light-icon {
      display: none;
    }
    .dark-icon {
      display: block;
    }
  }

  .theme-transition-clone.light & {
    .light-icon {
      display: block !important;
    }
    .dark-icon {
      display: none !important;
    }
  }

  .theme-transition-clone.dark & {
    .light-icon {
      display: none !important;
    }
    .dark-icon {
      display: block !important;
    }
  }
}
</style>
