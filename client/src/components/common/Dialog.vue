<script setup>
import { useDialog } from '@/composables/useDialog'
import Button from '@/components/common/Button.vue'

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
          <h2 v-if="dialogState.title">
            {{ dialogState.title }}
          </h2>
          <p>
            {{ dialogState.description }}
          </p>
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

<style lang="scss" scoped>
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
  gap: 1rem;
  background-color: var(--background);
  border-radius: 0.5rem;
  max-width: 32rem;
  padding: 1.5rem;
  width: 100%;

  .dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    h2 {
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 600;
    }
    p {
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
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
