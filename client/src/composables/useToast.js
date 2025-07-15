import { reactive } from "vue"

const toastState = reactive({
  toasts: []
})

let toastId = 0

export function useToast() {
  const show = (options = {}) => {
    const toast = {
      action: options.action || null,
      description: options.description || "",
      dismissible: options.dismissible !== false,
      duration: options.duration !== undefined ? options.duration : 5000,
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
    clear,
    remove,
    show,
    toastState
  }
}
