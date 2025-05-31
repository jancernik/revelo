<script setup>
import { ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import Button from '@/components/common/Button.vue'

const { show } = useDialog()
const userName = ref('John Doe')

const showBasicDialog = () => {
  show({
    title: 'Basic Dialog',
    description: 'This is a simple dialog with just a message and a cancel button.',
    actions: [
      {
        name: 'OK',
        color: 'primary',
        callback: () => {
          console.log('OK clicked')
        }
      }
    ]
  })
}

const showConfirmDialog = () => {
  show({
    title: 'Delete Account',
    description: 'Are you sure you want to delete your account? This action cannot be undone.',
    actions: [
      {
        name: 'Delete',
        color: 'primary',
        icon: 'Trash2',
        callback: () => {
          console.log('Account deleted')
        }
      }
    ]
  })
}

const showSaveDialog = () => {
  show({
    title: 'Save Changes',
    description: 'You have unsaved changes. Do you want to save them before leaving?',
    actions: [
      {
        name: 'Save',
        color: 'primary',
        icon: 'Save',
        callback: () => {
          console.log('Changes saved')
        }
      }
    ]
  })
}

const showNonDismissibleDialog = () => {
  show({
    title: 'Processing',
    description: 'Please wait while we process your request. This may take a few moments.',
    dismissible: false,
    actions: [
      {
        name: 'Force Close',
        color: 'primary',
        callback: () => {
          console.log('Forced close')
        }
      }
    ]
  })
}

const showCustomActionsDialog = () => {
  show({
    title: 'Choose Action',
    description: 'What would you like to do with this file?',
    actions: [
      {
        name: 'Download',
        color: 'secondary',
        callback: () => {
          console.log('File downloaded')
        }
      },
      {
        name: 'Share',
        color: 'secondary',
        callback: () => {
          console.log('File shared')
        }
      },
      {
        name: 'Delete',
        color: 'secondary',
        callback: () => {
          console.log('File deleted')
        }
      }
    ]
  })
}

const showTitleOnlyDialog = () => {
  show({
    title: 'Quick Action',
    actions: [
      {
        name: 'Execute',
        color: 'primary',
        icon: 'Zap',
        callback: () => {
          console.log('Action executed')
        }
      }
    ]
  })
}

const showDescriptionOnlyDialog = () => {
  show({
    description:
      'This is a dialog with only a description and no title. Sometimes you just need to show a message without a formal heading.',
    actions: [
      {
        name: 'Understood',
        color: 'primary',
        callback: () => {
          console.log('Message acknowledged')
        }
      }
    ]
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
