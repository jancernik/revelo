<script setup>
import Button from '@/components/common/Button.vue'
import { useDialog } from '@/composables/useDialog'

const { show } = useDialog()

const showBasicDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('OK clicked')
        },
        color: 'primary',
        name: 'OK'
      }
    ],
    description: 'This is a simple dialog with just a message and a cancel button.',
    title: 'Basic Dialog'
  })
}

const showConfirmDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('Account deleted')
        },
        color: 'primary',
        icon: 'Trash2',
        name: 'Delete'
      }
    ],
    description: 'Are you sure you want to delete your account? This action cannot be undone.',
    title: 'Delete Account'
  })
}

const showSaveDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('Changes saved')
        },
        color: 'primary',
        icon: 'Save',
        name: 'Save'
      }
    ],
    description: 'You have unsaved changes. Do you want to save them before leaving?',
    title: 'Save Changes'
  })
}

const showNonDismissibleDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('Forced close')
        },
        color: 'primary',
        name: 'Force Close'
      }
    ],
    description: 'Please wait while we process your request. This may take a few moments.',
    dismissible: false,
    title: 'Processing'
  })
}

const showCustomActionsDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('File downloaded')
        },
        color: 'secondary',
        name: 'Download'
      },
      {
        callback: () => {
          console.log('File shared')
        },
        color: 'secondary',
        name: 'Share'
      },
      {
        callback: () => {
          console.log('File deleted')
        },
        color: 'secondary',
        name: 'Delete'
      }
    ],
    description: 'What would you like to do with this file?',
    title: 'Choose Action'
  })
}

const showTitleOnlyDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('Action executed')
        },
        color: 'primary',
        icon: 'Zap',
        name: 'Execute'
      }
    ],
    title: 'Quick Action'
  })
}

const showDescriptionOnlyDialog = () => {
  show({
    actions: [
      {
        callback: () => {
          console.log('Message acknowledged')
        },
        color: 'primary',
        name: 'Understood'
      }
    ],
    description:
      'This is a dialog with only a description and no title. Sometimes you just need to show a message without a formal heading.'
  })
}
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic Dialog</h5>
      <div class="example-row">
        <Button color="secondary" @click="showBasicDialog">Show Basic Dialog</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Confirmation Dialogs</h5>
      <div class="example-row">
        <Button color="secondary" @click="showConfirmDialog">Delete Account</Button>
        <Button color="secondary" @click="showSaveDialog">Save Changes</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Special Behaviors</h5>
      <div class="example-row">
        <Button color="secondary" @click="showNonDismissibleDialog">Non-dismissible</Button>
        <Button color="secondary" @click="showCustomActionsDialog">Multiple Actions</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Content Variations</h5>
      <div class="example-row">
        <Button color="secondary" @click="showTitleOnlyDialog">Title Only</Button>
        <Button color="secondary" @click="showDescriptionOnlyDialog">Description Only</Button>
      </div>
    </div>
  </div>
</template>
