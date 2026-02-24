<script setup>
import Button from "#src/components/common/Button.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { computed } from "vue"

const { footer } = useDashboardLayout()
const showFooter = computed(() => footer.actions.length > 0)
</script>

<template>
  <div v-if="showFooter" class="dashboard-footer">
    <div class="actions">
      <Button
        v-for="{ key, color, icon, onClick, text, disabled } in footer.actions"
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
.dashboard-footer {
  @include flex(row, flex-end, center);
  padding: var(--spacing-4) var(--spacing-5);
  background-color: var(--background);
  border-top: 1px solid var(--border);
  gap: var(--spacing-3);
  height: 4.5rem;
  position: sticky;
  bottom: 0;
  z-index: 400;

  .actions {
    @include flex(row, flex-end, center);
    gap: var(--spacing-3);
    flex-shrink: 0;
  }

  @include breakpoint("lg") {
    padding: var(--spacing-5) var(--spacing-8);
    gap: var(--spacing-6);
  }
}
</style>
