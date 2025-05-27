import { reactive } from 'vue'

const toastState = reactive({
  toasts: []
})

let toastId = 0

export function useToast() {
  const show = (options = {}) => {
    const toast = {
      id: ++toastId,
      type: options.type || 'info',
      title: options.title || '',
      description: options.description || '',
      duration: options.duration !== undefined ? options.duration : 5000,
      showIcon: options.showIcon !== false,
      dismissible: options.dismissible !== false,
      action: options.action || null
    }

    toastState.toasts.push(toast)

    if (toast.duration > 0) {
      setTimeout(() => {
        remove(toast.id)
      }, toast.duration * 1000)
    }

    return toast.id
  }

  const remove = (id) => {
    const index = toastState.toasts.findIndex((toast) => toast.id === id)
    if (index > -1) {
      toastState.toasts.splice(index, 1)
    }
  }

  const clear = () => {
    toastState.toasts = []
  }

  return {
    toastState,
    show,
    remove,
    clear
  }
}
