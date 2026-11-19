import { reactive } from "vue"

import type { ButtonColor, IconName } from "#src/components/common/types"

export interface Toast {
  action: null | ToastAction
  description: string
  dismissible: boolean
  duration: number
  id: number
  showIcon: boolean
  title: string
  type: ToastType
}

export interface ToastAction {
  callback?: () => void
  color?: ButtonColor
  icon?: IconName
  name: string
}

export interface ToastOptions {
  action?: null | ToastAction
  description?: string
  dismissible?: boolean
  duration?: number
  showIcon?: boolean
  title?: string
  type?: ToastType
}

export interface ToastState {
  toasts: Toast[]
}

export type ToastType = "error" | "info" | "success" | "warning"

const toastState = reactive<ToastState>({
  toasts: []
})

let toastId = 0

export function useToast() {
  const show = (options: ToastOptions = {}) => {
    const toast: Toast = {
      action: options.action || null,
      description: options.description || "",
      dismissible: options.dismissible !== false,
      duration: options.duration !== undefined ? options.duration : 4,
      id: ++toastId,
      showIcon: options.showIcon !== false,
      title: options.title || "",
      type: options.type || "info"
    }

    toastState.toasts.push(toast)

    if (toast.duration > 0) {
      setTimeout(() => {
        remove(toast.id)
      }, toast.duration * 1000)
    }

    return toast.id
  }

  const remove = (id: number) => {
    const index = toastState.toasts.findIndex((toast) => toast.id === id)
    if (index > -1) {
      toastState.toasts.splice(index, 1)
    }
  }

  const clear = () => {
    toastState.toasts = []
  }

  return {
    clear,
    remove,
    show,
    toastState
  }
}
