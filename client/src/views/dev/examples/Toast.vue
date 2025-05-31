<script setup>
import { useToast } from '@/composables/useToast'
import Button from '@/components/common/Button.vue'

const { show, clear } = useToast()

const showSuccessToast = () => {
  show({
    type: 'success',
    title: 'Success!',
    description: 'Your changes have been saved successfully.',
    duration: 4
  })
}

const showErrorToast = () => {
  show({
    type: 'error',
    title: 'Error occurred',
    description: 'Failed to save your changes. Please try again.',
    duration: 6
  })
}

const showWarningToast = () => {
  show({
    type: 'warning',
    title: 'Warning',
    description: 'Your session will expire in 5 minutes.',
    duration: 5
  })
}

const showInfoToast = () => {
  show({
    type: 'info',
    title: 'New feature available',
    description: 'Check out our latest update in the settings panel.',
    duration: 4
  })
}

const showTitleOnlyToast = () => {
  show({
    type: 'success',
    title: 'File uploaded successfully!',
    duration: 3,
    dismissible: false
  })
}

const showDescriptionOnlyToast = () => {
  show({
    type: 'info',
    description: 'This toast only has a description without a title.',
    duration: 3,
    dismissible: false
  })
}

const showWithActionToast = () => {
  show({
    type: 'info',
    title: 'New message',
    description: 'You have a new message from John Doe.',
    duration: 8,
    dismissible: false,
    action: {
      name: 'View',
      color: 'primary',
      icon: 'Eye',
      callback: () => {
        console.log('Viewing message')
      }
    }
  })
}

const showUndoToast = () => {
  show({
    type: 'info',
    title: 'Item deleted',
    description: 'The item has been moved to trash.',
    duration: 10,
    dismissible: false,
    action: {
      name: 'Undo',
      color: 'secondary',
      icon: 'Undo',
      callback: () => {
        console.log('Undo delete')
      }
    }
  })
}

const showPersistentToast = () => {
  show({
    type: 'warning',
    title: 'Persistent notification',
    description: 'This toast will stay until manually dismissed.',
    duration: 0,
    dismissible: true
  })
}

const showNonDismissibleToast = () => {
  show({
    type: 'info',
    title: 'Processing...',
    description: 'Please wait while we process your request.',
    duration: 0,
    dismissible: false,
    action: {
      name: 'Cancel',
      color: 'secondary',
      callback: () => {
        console.log('Process cancelled')
      }
    }
  })
}

const showMultipleToasts = () => {
  show({
    type: 'info',
    title: 'First toast',
    description: 'This is the first toast.',
    duration: 3
  })

  setTimeout(() => {
    show({
      type: 'success',
      title: 'Second toast',
      description: 'This is the second toast.',
      duration: 3
    })
  }, 500)

  setTimeout(() => {
    show({
      type: 'warning',
      title: 'Third toast',
      description: 'This is the third toast.',
      duration: 3
    })
  }, 1000)
}

const showLongContentToast = () => {
  show({
    type: 'info',
    title: 'Long content example',
    description:
      'This is an example of a toast with much longer content to demonstrate how the component handles text wrapping and maintains readability with extended descriptions.',
    duration: 6,
    action: {
      name: 'Read More',
      color: 'primary',
      callback: () => {
        console.log('Reading more')
      }
    }
  })
}

const clearAllToasts = () => {
  clear()
  show({
    type: 'info',
    title: 'All toasts cleared',
    duration: 2,
    dismissible: false
  })
}
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Toast Types</h5>
      <div class="example-row">
        <Button icon="CheckCircle" color="secondary" @click="showSuccessToast">Success</Button>
        <Button icon="AlertCircle" color="secondary" @click="showErrorToast">Error</Button>
        <Button icon="AlertTriangle" color="secondary" @click="showWarningToast">Warning</Button>
        <Button icon="Info" color="secondary" @click="showInfoToast">Info</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Content Variations</h5>
      <div class="example-row">
        <Button color="secondary" @click="showTitleOnlyToast">Title Only</Button>
        <Button color="secondary" @click="showDescriptionOnlyToast">Description Only</Button>
        <Button color="secondary" @click="showLongContentToast">Long Content</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>With Actions</h5>
      <div class="example-row">
        <Button icon="Bell" color="secondary" @click="showWithActionToast">View Message</Button>
        <Button icon="Trash2" color="secondary" @click="showUndoToast">Delete Item</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Persistence Options</h5>
      <div class="example-row">
        <Button color="secondary" @click="showPersistentToast">Persistent</Button>
        <Button color="secondary" @click="showNonDismissibleToast">Non-dismissible</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Multiple & Management</h5>
      <div class="example-row">
        <Button color="secondary" @click="showMultipleToasts">Show Multiple</Button>
        <Button color="secondary" @click="clearAllToasts">Clear All</Button>
      </div>
    </div>
  </div>
</template>
