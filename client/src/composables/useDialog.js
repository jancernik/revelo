import { reactive } from 'vue'

const dialogState = reactive({
  actions: [],
  description: '',
  dismissible: true,
  isOpen: false,
  title: ''
})

export function useDialog() {
  const show = (options = {}) => {
    Object.assign(dialogState, {
      actions: options.actions || [],
      description: options.description || '',
      dismissible: options.dismissible !== false,
      isOpen: true,
      title: options.title || ''
    })
  }

  const hide = () => {
    dialogState.isOpen = false
    dialogState.title = ''
    dialogState.description = ''
    dialogState.dismissible = true
    dialogState.actions = []
  }

  return {
    dialogState,
    hide,
    show
  }
}
