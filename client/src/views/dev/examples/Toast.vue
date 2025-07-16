<script setup>
import Button from "#src/components/common/Button.vue"
import { useToast } from "#src/composables/useToast"

const { clear, show } = useToast()

const showSuccessToast = () => {
  show({
    description: "Your changes have been saved successfully.",
    duration: 4,
    title: "Success!",
    type: "success"
  })
}

const showErrorToast = () => {
  show({
    description: "Failed to save your changes. Please try again.",
    duration: 6,
    title: "Error occurred",
    type: "error"
  })
}

const showWarningToast = () => {
  show({
    description: "Your session will expire in 5 minutes.",
    duration: 5,
    title: "Warning",
    type: "warning"
  })
}

const showInfoToast = () => {
  show({
    description: "Check out our latest update in the settings panel.",
    duration: 4,
    title: "New feature available",
    type: "info"
  })
}

const showTitleOnlyToast = () => {
  show({
    dismissible: false,
    duration: 3,
    title: "File uploaded successfully!",
    type: "success"
  })
}

const showDescriptionOnlyToast = () => {
  show({
    description: "This toast only has a description without a title.",
    dismissible: false,
    duration: 3,
    type: "info"
  })
}

const showWithActionToast = () => {
  show({
    action: {
      callback: () => {
        console.log("Viewing message")
      },
      color: "primary",
      icon: "Eye",
      name: "View"
    },
    description: "You have a new message from John Doe.",
    dismissible: false,
    duration: 8,
    title: "New message",
    type: "info"
  })
}

const showUndoToast = () => {
  show({
    action: {
      callback: () => {
        console.log("Undo delete")
      },
      color: "secondary",
      icon: "Undo",
      name: "Undo"
    },
    description: "The item has been moved to trash.",
    dismissible: false,
    duration: 10,
    title: "Item deleted",
    type: "info"
  })
}

const showPersistentToast = () => {
  show({
    description: "This toast will stay until manually dismissed.",
    dismissible: true,
    duration: 0,
    title: "Persistent notification",
    type: "warning"
  })
}

const showNonDismissibleToast = () => {
  show({
    action: {
      callback: () => {
        console.log("Process cancelled")
      },
      color: "secondary",
      name: "Cancel"
    },
    description: "Please wait while we process your request.",
    dismissible: false,
    duration: 0,
    title: "Processing...",
    type: "info"
  })
}

const showMultipleToasts = () => {
  show({
    description: "This is the first toast.",
    duration: 3,
    title: "First toast",
    type: "info"
  })

  setTimeout(() => {
    show({
      description: "This is the second toast.",
      duration: 3,
      title: "Second toast",
      type: "success"
    })
  }, 500)

  setTimeout(() => {
    show({
      description: "This is the third toast.",
      duration: 3,
      title: "Third toast",
      type: "warning"
    })
  }, 1000)
}

const showLongContentToast = () => {
  show({
    action: {
      callback: () => {
        console.log("Reading more")
      },
      color: "primary",
      name: "Read More"
    },
    description:
      "This is an example of a toast with much longer content to demonstrate how the component handles text wrapping and maintains readability with extended descriptions.",
    duration: 6,
    title: "Long content example",
    type: "info"
  })
}

const clearAllToasts = () => {
  clear()
  show({
    dismissible: false,
    duration: 2,
    title: "All toasts cleared",
    type: "info"
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
