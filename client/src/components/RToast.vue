<script setup>
import { useToast } from '@/composables/useToast'
import RButton from '@/components/RButton.vue'
import RIcon from '@/components/RIcon.vue'

const ICONS = {
  success: 'CheckCircle',
  error: 'AlertCircle',
  warning: 'AlertTriangle',
  info: 'Info'
}

const { toastState, remove } = useToast()

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
              <RIcon v-if="toast.showIcon" :name="getTypeIcon(toast.type)" :size="20" />
            </div>

            <div class="text">
              <h3 v-if="toast.title" class="title">
                {{ toast.title }}
              </h3>
              <p v-if="toast.description" class="description">
                {{ toast.description }}
              </p>
            </div>
          </div>

          <div class="action">
            <RButton
              v-if="toast.action"
              :color="toast.action.color || 'secondary'"
              :icon="toast.action.icon"
              @click="handleAction(toast)"
            >
              {{ toast.action.name }}
            </RButton>
          </div>
          <button v-if="toast.dismissible" class="close" @click="remove(toast.id)">
            <RIcon name="X" size="16" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
$shadow:
  0 3px 10px rgba(0, 0, 0, 0.1),
  0 3px 3px rgba(0, 0, 0, 0.05);

.toast-container {
  position: fixed;
  top: $md-spacing;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
  z-index: 1200;
  max-width: 24rem;
  width: auto;
  pointer-events: none;
}

.toast-wrapper {
  pointer-events: auto;
  width: fit-content;
  min-width: 200px;
  max-width: 24rem;
  margin: 0 auto;
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  background: #fff;
  border-radius: 0.375rem;
  padding: 1rem;
  width: 100%;
  box-shadow: $shadow;

  .icon {
    @include flex-center;
    color: #000;
    align-self: center;
    flex-shrink: 0;
  }

  &-success .icon {
    color: #10b981;
  }

  &-error .icon {
    color: #ef4444;
  }

  &-warning .icon {
    color: #f59e0b;
  }

  .content {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex: 1;
    gap: 0.75rem;
    min-width: 0;
  }

  .text {
    flex: 1;
    min-width: 0;

    .title {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.25rem;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .description {
      font-size: 0.75rem;
      line-height: 1rem;
      color: #6b7280;
      word-wrap: break-word;
      overflow-wrap: break-word;
      margin-top: 0.25rem;
    }
  }

  .action {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0.5rem;
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
    border-radius: 0.25rem;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f3f4f6;
    }
  }
}

.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.42, 0.06, 0.14, 1);
}

.toast-leave-active {
  transition: 0.5s cubic-bezier(0.27, 0.03, 0.3, 1);
  position: absolute;
}

.toast-move {
  transition: 0.25s cubic-bezier(0.42, 0.06, 0.14, 1);
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
