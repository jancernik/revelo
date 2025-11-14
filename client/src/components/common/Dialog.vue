<script setup>
import Button from "#src/components/common/Button.vue"
import Icon from "#src/components/common/Icon.vue"
import { useDialog } from "#src/composables/useDialog"
import { watch } from "vue"

const { dialogState, hide } = useDialog()

const handleHide = () => {
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

const handleKeyDown = (event) => {
  if (dialogState.dismissible && event.key === "Escape") {
    event.preventDefault()
    handleHide()
  }
}

watch(dialogState, ({ isOpen }) => {
  if (isOpen) {
    window.addEventListener("keydown", handleKeyDown)
  } else {
    window.removeEventListener("keydown", handleKeyDown)
  }
})
</script>

<template>
  <Transition name="dialog">
    <div v-if="dialogState.isOpen" class="dialog-overlay" @click="handleHide">
      <div class="dialog" @click.stop>
        <div v-if="dialogState.title || dialogState.description" class="dialog-body">
          <h5 v-if="dialogState.title">
            {{ dialogState.title }}
          </h5>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p v-html="dialogState.description"></p>
        </div>

        <div v-if="!dialogState.useX || dialogState.actions.length" class="dialog-footer">
          <Button
            v-if="dialogState.dismissible && !dialogState.useX"
            color="secondary"
            @click="hide"
          >
            Cancel
          </Button>

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
        <button class="close-x">
          <Icon
            v-if="dialogState.useX && dialogState.dismissible"
            name="X"
            size="20"
            @click="handleHide"
          />
        </button>
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
  position: relative;
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
      @include text("base");
      font-weight: var(--font-normal);
      color: var(--muted-foreground);
    }
  }

  .dialog-footer {
    @include flex(row, flex-end);
    gap: var(--spacing-2);
  }

  .close-x {
    @include flex-center;
    position: absolute;
    right: var(--spacing-3);
    top: var(--spacing-3);
    color: var(--foreground);
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.75;
    transition: 0.1s ease-in-out;
    &:hover {
      opacity: 1;
    }
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
