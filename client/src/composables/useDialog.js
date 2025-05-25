import { reactive } from 'vue'

const dialogState = reactive({
  isOpen: false,
  title: '',
  description: '',
  dismissible: true,
  actions: []
})

export function useDialog() {
  const show = (options = {}) => {
    Object.assign(dialogState, {
      isOpen: true,
      title: options.title || '',
      description: options.description || '',
      dismissible: options.dismissible !== false,
      actions: options.actions || []
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
    show,
    hide
  }
}
