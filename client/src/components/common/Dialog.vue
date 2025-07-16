<script setup>
import Button from "#src/components/common/Button.vue"
import { useDialog } from "#src/composables/useDialog"

const { dialogState, hide } = useDialog()

const handleOverlayClick = () => {
  if (dialogState.dismissible) {
    hide()
  }
}

const handleAction = (action) => {
  if (action.callback) {
    action.callback()
  }
  hide()
}
</script>

<template>
  <Transition name="dialog">
    <div v-if="dialogState.isOpen" class="dialog-overlay" @click="handleOverlayClick">
      <div class="dialog" @click.stop>
        <div v-if="dialogState.title || dialogState.description" class="dialog-body">
          <h5 v-if="dialogState.title">
            {{ dialogState.title }}
          </h5>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p v-html="dialogState.description"></p>
        </div>

        <div class="dialog-footer">
          <Button v-if="dialogState.dismissible" color="secondary" @click="hide"> Cancel </Button>

          <Button
            v-for="(action, index) in dialogState.actions"
            :key="index"
            :color="action.color || 'primary'"
            :icon="action.icon"
            @click="handleAction(action)"
          >
            {{ action.name }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss">
.dialog-overlay {
  @include flex-center;
  @include fill-parent;
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  z-index: z(dialog);
  backdrop-filter: blur(2px);
}

.dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  background-color: var(--background);
  border-radius: var(--radius-lg);
  max-width: 32rem;
  padding: var(--spacing-6);
  width: 100%;
  border: 1px solid var(--border);

  .dialog-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);

    p {
      @include text("sm");
      font-weight: var(--font-normal);
      color: var(--muted-foreground);
    }
  }

  .dialog-footer {
    @include flex(row, flex-end);
    gap: var(--spacing-2);
  }
}

.dialog {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.3s ease-in-out;

    .dialog {
      transition: all 0.3s ease-in-out;
    }
  }

  &-enter-from,
  &-leave-to {
    opacity: 0;

    .dialog {
      opacity: 0;
      transform: scale(0.95);
    }
  }
}
</style>
