<script setup>
import Button from "#src/components/common/Button.vue"
import { useToast } from "#src/composables/useToast"
import api from "#src/utils/api"

const { show: showToast } = useToast()

const handleCleanupStaged = async () => {
  try {
    showToast({ dismissible: false, title: "Cleanup Initiated", type: "info" })
    const response = await api.post("/tasks/cleanup/images/staged")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Cleanup Staged Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to clean up temporary images."
    showToast({
      description: errorMessage,
      title: "Cleanup Failed",
      type: "error"
    })
  }
}

const handleCleanupOrphaned = async () => {
  try {
    showToast({ dismissible: false, title: "Cleanup Initiated", type: "info" })
    const response = await api.post("/tasks/cleanup/images/orphaned")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Cleanup Orphaned Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to clean up orphaned images."
    showToast({
      description: errorMessage,
      title: "Cleanup Failed",
      type: "error"
    })
  }
}

const handleBackfillEmbeddings = async () => {
  try {
    showToast({ dismissible: false, title: "Backfill Initiated", type: "info" })
    const response = await api.post("/tasks/backfill/embeddings")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Successful: ${data.successful}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Embedding Backfill Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to backfill embeddings."
    showToast({
      description: errorMessage,
      title: "Failed to backfill embeddings",
      type: "error"
    })
  }
}

const handleBackfillCaptions = async () => {
  try {
    showToast({ dismissible: false, title: "Backfill Initiated", type: "info" })
    const response = await api.post("/tasks/backfill/captions")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Successful: ${data.successful}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Caption Backfill Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to backfill embeddings."
    showToast({
      description: errorMessage,
      title: "Failed to backfill embeddings",
      type: "error"
    })
  }
}
</script>

<template>
  <div class="tasks">
    <h4>Tasks</h4>
    <div class="tasks-content">
      <Button @click="handleCleanupStaged"> Cleanup Staged Images </Button>
      <Button @click="handleCleanupOrphaned"> Cleanup Orphaned Images </Button>
      <Button @click="handleBackfillEmbeddings"> Backfill Embeddings </Button>
      <Button @click="handleBackfillCaptions"> Backfill Captions </Button>
    </div>
  </div>
</template>

<style lang="scss">
.tasks {
  @include flex-center;
  flex-direction: column;
  gap: var(--spacing-2);
  .tasks-content {
    @include flex-center;
    gap: var(--spacing-2);
  }
}
</style>
