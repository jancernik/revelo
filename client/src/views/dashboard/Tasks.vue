<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"

import type { ApiSuccess } from "#src/types/api"
import type { BackfillTaskResult, CleanupTaskResult } from "#src/types/models"

import Button from "#src/components/common/Button.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import api, { errorMessage as getErrorMessage } from "#src/utils/api"

const { resetHeader, setHeader } = useDashboardLayout()
const { show: showToast } = useToast()

const handleCleanupStaged = async () => {
  try {
    showToast({ dismissible: false, title: "Cleanup Initiated", type: "info" })
    const response = await api.post<ApiSuccess<{ result: CleanupTaskResult }>>(
      "/tasks/cleanup/images/staged"
    )
    const data: Partial<CleanupTaskResult> = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Cleanup Staged Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error) || "Failed to clean up temporary images."
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
    const response = await api.post<ApiSuccess<{ result: CleanupTaskResult }>>(
      "/tasks/cleanup/images/orphaned"
    )
    const data: Partial<CleanupTaskResult> = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Cleanup Orphaned Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error) || "Failed to clean up orphaned images."
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
    const response = await api.post<ApiSuccess<{ result: BackfillTaskResult }>>(
      "/tasks/backfill/embeddings"
    )
    const data: Partial<BackfillTaskResult> = response.data?.data?.result || {}
    showToast({
      description: `Successful: ${data.successful}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Embedding Backfill Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error) || "Failed to backfill embeddings."
    showToast({
      description: errorMessage,
      title: "Failed to backfill embeddings",
      type: "error"
    })
  }
}

const handleBackfillDescriptions = async () => {
  try {
    showToast({ dismissible: false, title: "Backfill Initiated", type: "info" })
    const response = await api.post<ApiSuccess<{ result: BackfillTaskResult }>>(
      "/tasks/backfill/captions"
    )
    const data: Partial<BackfillTaskResult> = response.data?.data?.result || {}
    showToast({
      description: `Successful: ${data.successful}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      title: "Description Backfill Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage = getErrorMessage(error) || "Failed to backfill descriptions."
    showToast({
      description: errorMessage,
      title: "Failed to backfill descriptions",
      type: "error"
    })
  }
}

onMounted(() => {
  setHeader({
    title: "Tasks"
  })
})

onUnmounted(resetHeader)
</script>

<template>
  <div class="tasks">
    <div class="tasks-content">
      <Button @click="handleCleanupStaged"> Cleanup Staged Images </Button>
      <Button @click="handleCleanupOrphaned"> Cleanup Orphaned Images </Button>
      <Button @click="handleBackfillEmbeddings"> Backfill Embeddings </Button>
      <Button @click="handleBackfillDescriptions"> Backfill Descriptions </Button>
    </div>
  </div>
</template>

<style lang="scss">
.tasks {
  @include flex-center;
  flex-direction: column;
  gap: var(--spacing-2);

  .tasks-content {
    @include flex-center(column);
    width: 100%;
    gap: var(--spacing-2);

    button {
      width: 100%;
    }

    @include breakpoint("md") {
      flex-direction: row;
      flex-wrap: wrap;
      width: auto;

      button {
        width: auto;
      }
    }
  }
}
</style>
