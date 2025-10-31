<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useDialog } from "#src/composables/useDialog"
import { useSettings } from "#src/composables/useSettings"

const { settings } = useSettings()
const { show } = useDialog()

const showDialog = () => {
  show({
    description: settings.value?.aboutDialogDescription,
    title: settings.value?.aboutDialogTitle,
    useX: true
  })
}
</script>

<template>
  <div class="about-dialog">
    <button class="about-dialog-button" @click="showDialog">
      <Icon name="CircleQuestionMark" :size="18" />
    </button>
  </div>
</template>

<style lang="scss">
.about-dialog {
  padding-inline: var(--spacing-1);

  .about-dialog-button {
    @include flex-center;
    width: 2.25rem;
    height: 2.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--foreground);
  }
}
</style>
