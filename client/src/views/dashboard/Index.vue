<script setup>
import Button from "#src/components/common/Button.vue"
import { useToast } from "#src/composables/useToast"
import api from "#src/utils/api"

const { show: showToast } = useToast()

const handleCleanupTemp = async () => {
  try {
    const response = await api.post("/maintenance/cleanup-temp")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      duration: 5,
      title: "Cleanup Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to clean up temporary images."
    showToast({
      description: errorMessage,
      duration: 5,
      title: "Cleanup Failed",
      type: "error"
    })
  }
}

const handleCleanupOrphaned = async () => {
  try {
    const response = await api.post("/maintenance/cleanup-orphaned")
    const data = response.data?.data?.result || {}
    showToast({
      description: `Deleted: ${data.deleted}\nErrors: ${data.errors}\nScanned: ${data.scanned}`,
      duration: 5,
      title: "Cleanup Successful",
      type: "success"
    })
  } catch (error) {
    const errorMessage =
      error.response?.data?.message || error.message || "Failed to clean up orphaned images."
    showToast({
      description: errorMessage,
      duration: 5,
      title: "Cleanup Failed",
      type: "error"
    })
  }
}
</script>

<template>
  <div class="dashboard">
    <router-link to="/dashboard/upload">
      <Button>Upload</Button>
    </router-link>
    <router-link to="/dashboard/settings">
      <Button>Settings</Button>
    </router-link>
    <Button @click="handleCleanupTemp"> Cleanup Temporary Images </Button>
    <Button @click="handleCleanupOrphaned"> Cleanup Orphaned Images </Button>
  </div>
</template>

<style lang="scss">
.dashboard {
  @include flex-center;
  @include fill-parent;
}
</style>
