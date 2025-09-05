<script setup>
import Button from "#src/components/common/Button.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { computed } from "vue"

const { header, selection } = useDashboardLayout()
const isSelecting = computed(() => selection.items > 0)
const onlyOneSelected = computed(() => selection.items === 1)
</script>

<template>
  <div v-if="isSelecting" class="dashboard-header">
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
        :disabled="disabled"
        @click="onClick"
      >
        {{ text }}
      </Button>
    </div>
  </div>
  <div v-else class="dashboard-header">
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
  padding: var(--spacing-5) var(--spacing-8);
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  gap: var(--spacing-6);
  height: 4.5rem;
  position: sticky;
  top: 0;
  z-index: 400;
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
    }
  }

  .actions {
    @include flex(row, flex-end, center);
    gap: var(--spacing-3);
    flex-shrink: 0;
  }
}
</style>
