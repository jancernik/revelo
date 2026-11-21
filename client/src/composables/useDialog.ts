import { reactive } from "vue"

import type { ButtonColor, IconName } from "#src/components/common/types"

export interface DialogAction {
  callback?: () => void
  color?: ButtonColor
  icon?: IconName
  name: string
}

export interface DialogOptions {
  actions?: DialogAction[]
  description?: string
  dismissible?: boolean
  title?: string
  useX?: boolean
}

export interface DialogState {
  actions: DialogAction[]
  description: string
  dismissible: boolean
  isOpen: boolean
  title: string
  useX: boolean
}

const dialogState = reactive<DialogState>({
  actions: [],
  description: "",
  dismissible: true,
  isOpen: false,
  title: "",
  useX: false
})

export function useDialog() {
  const show = (options: DialogOptions = {}) => {
    Object.assign(dialogState, {
      actions: options.actions || [],
      description: options.description || "",
      dismissible: options.dismissible !== false,
      isOpen: true,
      title: options.title || "",
      useX: options.useX || false
    })
  }

  const hide = () => {
    dialogState.isOpen = false
    dialogState.title = ""
    dialogState.description = ""
    dialogState.dismissible = true
    dialogState.useX = false
    dialogState.actions = []
  }

  return {
    dialogState,
    hide,
    show
  }
}
