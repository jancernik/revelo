<script setup>
import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useDevice } from "#src/composables/useDevice"
import { computed } from "vue"

const { isMobile } = useDevice()
const { header, selection, toggleMobileMenu } = useDashboardLayout()
const isSelecting = computed(() => selection.items > 0)
const onlyOneSelected = computed(() => selection.items === 1)
</script>

<template>
  <div v-if="isSelecting" class="dashboard-header">
    <button class="mobile-menu-btn" @click="toggleMobileMenu">
      <Icon name="Menu" size="20" />
    </button>
    <div class="text">
      <p v-if="onlyOneSelected">1 item selected</p>
      <p v-else>{{ selection.items }} items selected</p>
    </div>
    <div class="actions">
      <Button
        v-for="{ key, color, icon, onClick, text, disabled } in selection.actions"
        :key="key"
        :color="color"
        :icon="icon"
        :icon-only="isMobile"
        :disabled="disabled"
        @click="onClick"
      >
        {{ text }}
      </Button>
    </div>
  </div>
  <div v-else class="dashboard-header">
    <button class="mobile-menu-btn" @click="toggleMobileMenu">
      <Icon name="Menu" size="20" />
    </button>
    <div class="text">
      <h5 v-if="header.title">{{ header.title }}</h5>
      <p v-if="header.subtitle">{{ header.subtitle }}</p>
    </div>
    <div class="actions">
      <Button
        v-for="{ key, color, icon, onClick, text, disabled } in header.actions"
        :key="key"
        :color="color"
        :icon="icon"
        :icon-only="isMobile"
        :disabled="disabled"
        @click="onClick"
      >
        {{ text }}
      </Button>
    </div>
  </div>
</template>

<style lang="scss">
.dashboard-header {
  @include flex(row, space-between, center);
  padding: var(--spacing-4) var(--spacing-5);
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  gap: var(--spacing-4);
  height: 4.5rem;
  position: sticky;
  top: 0;
  z-index: 400;

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--foreground);
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: var(--secondary-hover);
    }
  }

  .text {
    @include flex(column, flex-start, flex-start);
    gap: var(--spacing-1);
    min-width: 0;
    flex: 1;

    h5 {
      margin: 0;
      color: var(--foreground);
      @include text("lg");
      font-weight: var(--font-semibold);
      line-height: 1.2;
    }

    p {
      margin: 0;
      color: var(--muted-foreground);
      @include text("sm");
      font-weight: var(--font-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .actions {
    @include flex(row, flex-end, center);
    gap: var(--spacing-1);
    flex-shrink: 0;
  }

  @include breakpoint("lg") {
    padding: var(--spacing-5) var(--spacing-8);

    .mobile-menu-btn {
      display: none;
    }

    .actions {
      gap: var(--spacing-3);
    }
  }
}
</style>
