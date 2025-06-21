<script setup>
import Button from '@/components/common/Button.vue'
import Icon from '@/components/common/Icon.vue'
import { useToast } from '@/composables/useToast'

const ICONS = {
  error: 'AlertCircle',
  info: 'Info',
  success: 'CheckCircle',
  warning: 'AlertTriangle'
}

const { remove, toastState } = useToast()

const getTypeIcon = (type) => {
  return ICONS[type] || 'info'
}

const handleAction = (toast) => {
  if (toast.action?.callback) {
    toast.action.callback()
  }
  remove(toast.id)
}
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastState.toasts"
        :key="toast.id"
        :class="['toast-wrapper', { 'toast-visible': toast.visible }]"
      >
        <div :class="['toast', `toast-${toast.type}`]">
          <div class="content">
            <div class="icon">
              <Icon v-if="toast.showIcon" :name="getTypeIcon(toast.type)" :size="20" />
            </div>

            <div class="text">
              <p v-if="toast.title" class="title">
                {{ toast.title }}
              </p>
              <p v-if="toast.description" class="description">
                {{ toast.description }}
              </p>
            </div>
          </div>

          <div class="action">
            <Button
              v-if="toast.action"
              :color="toast.action.color || 'secondary'"
              :icon="toast.action.icon"
              @click="handleAction(toast)"
            >
              {{ toast.action.name }}
            </Button>
          </div>
          <button v-if="toast.dismissible" class="close" @click="remove(toast.id)">
            <Icon name="X" size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss">
.toast-container {
  position: fixed;
  top: var(--spacing-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--spacing-2);
  z-index: 1200;
  width: 24rem;
  max-width: 24rem;
  width: 100%;
  pointer-events: none;

  .toast-wrapper {
    @include flex-center;
    pointer-events: auto;
    width: 100%;
    min-width: 200px;
    max-width: 24rem;
    transform-origin: top center;
  }

  .toast {
    @include flex(row, space-between, center);
    position: relative;
    gap: var(--spacing-2);
    background-color: var(--background);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);

    .icon {
      @include flex-center;
      color: var(--primary);
      align-self: center;
      flex-shrink: 0;
    }

    &-success .icon {
      color: var(--success);
    }

    &-error .icon {
      color: var(--danger);
    }

    &-warning .icon {
      color: var(--warning);
    }

    .content {
      display: flex;
      flex: 1;
      gap: var(--spacing-3);
      min-width: 0;
    }

    .text {
      flex: 1;
      min-width: 0;

      .title {
        @include text('sm');
        font-weight: var(--font-semibold);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .description {
        @include text('xs');
        font-weight: var(--font-semibold);
        color: var(--muted-foreground);
        word-wrap: break-word;
        overflow-wrap: break-word;
        margin-top: 0.25rem;
        white-space: pre-line;
      }
    }

    .action {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.5rem;
      height: 100%;
    }

    .close {
      position: absolute;
      top: 0.25rem;
      right: 0.25rem;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0;
      color: var(--muted-foreground);
    }
  }
}

.toast-move {
  transition: 0.25s cubic-bezier(0.42, 0.06, 0.14, 1);
}

.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.42, 0.06, 0.14, 1);
}

.toast-leave-active {
  transition: 0.5s cubic-bezier(0.27, 0.03, 0.3, 1);
  position: absolute;
  z-index: -1;
}

.toast-enter-from {
  transform: translate3d(0, -200%, 0) scale(0.6);
  opacity: 0.5;
}

.toast-leave-to {
  transform: translate3d(0, -150%, -1px) scale(0.6);
  opacity: 0;
}
</style>
