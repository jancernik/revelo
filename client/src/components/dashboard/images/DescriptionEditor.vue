<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"

const props = defineProps({
  imageId: {
    required: true,
    type: String
  }
})

const MAX_LENGTH = 500
const POLL_INTERVAL_MS = 4000
const SOURCE_LABELS = {
  edited: "Edited",
  generated: "Generated",
  translated: "Translated"
}

const imagesStore = useImagesStore()
const { show: showToast } = useToast()
const languageNames = new Intl.DisplayNames(["en"], { type: "language" })

const descriptions = ref([])
const drafts = ref({})
const busy = ref(null)
let pollTimer = null

const rows = computed(() =>
  descriptions.value.map((item) => {
    const draft = drafts.value[item.language] ?? ""
    return {
      ...item,
      changed: draft.trim() !== (item.text ?? "") && draft.trim() !== "",
      label: languageNames.of(item.language),
      status: SOURCE_LABELS[item.source] ?? "Pending"
    }
  })
)

const apply = (list) => {
  const previous = Object.fromEntries(descriptions.value.map((item) => [item.language, item.text]))
  for (const item of list) {
    const draft = drafts.value[item.language]
    if (draft === undefined || draft === (previous[item.language] ?? "")) {
      drafts.value[item.language] = item.text ?? ""
    }
  }
  descriptions.value = list
  schedulePoll()
}

const stopPolling = () => {
  clearTimeout(pollTimer)
  pollTimer = null
}

const schedulePoll = () => {
  stopPolling()
  if (!descriptions.value.some((item) => item.source === null)) return

  pollTimer = setTimeout(async () => {
    try {
      apply(await imagesStore.fetchDescriptions(props.imageId))
    } catch {
      stopPolling()
    }
  }, POLL_INTERVAL_MS)
}

const run = async (language, action, success) => {
  try {
    busy.value = language
    const list = await action()
    drafts.value[language] = undefined
    apply(list)
    showToast({ description: success, title: "Description Updated", type: "success" })
  } catch {
    // error handled by store
  } finally {
    busy.value = null
  }
}

const save = (row) =>
  run(
    row.language,
    () =>
      imagesStore.updateDescription(props.imageId, row.language, drafts.value[row.language].trim()),
    `${row.label} description saved.`
  )

const regenerate = (row) =>
  run(
    row.language,
    () => imagesStore.regenerateDescriptions(props.imageId, [row.language]),
    `${row.label} description will be generated again.`
  )

onMounted(async () => {
  try {
    apply(await imagesStore.fetchDescriptions(props.imageId))
  } catch {
    // error handled by store
  }
})

onUnmounted(stopPolling)
</script>

<template>
  <div class="description-editor">
    <div class="description-editor-header">
      <h4>Descriptions</h4>
      <p>Used as the alternative text of the image. Edited texts are never overwritten.</p>
    </div>
    <div v-for="row in rows" :key="row.language" class="description" :data-language="row.language">
      <div class="description-title">
        <span class="language">{{ row.label }}</span>
        <span class="status" :class="{ pending: row.source === null }">{{ row.status }}</span>
      </div>
      <Input
        v-model="drafts[row.language]"
        multiline
        :rows="3"
        :maxlength="MAX_LENGTH"
        :disabled="busy === row.language"
        :placeholder="row.source === null ? 'Being generated. You can also write it.' : ''"
        :aria-label="`${row.label} description`"
      />
      <div class="description-actions">
        <Button
          color="secondary"
          icon="RefreshCw"
          :disabled="busy !== null || row.source === null"
          @click="regenerate(row)"
        >
          Regenerate
        </Button>
        <Button icon="Save" :disabled="busy !== null || !row.changed" @click="save(row)">
          Save
        </Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.description-editor {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--background);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);

  @include breakpoint("md") {
    padding: var(--spacing-5);
  }

  .description-editor-header {
    h4 {
      @include text("sm");
      font-weight: var(--font-semibold);
      color: var(--foreground);
      margin: 0 0 var(--spacing-1) 0;
    }

    p {
      @include text("xs");
      color: var(--muted-foreground);
      margin: 0;
    }
  }

  .description {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);

    .description-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-2);

      .language {
        @include text("sm");
        font-weight: var(--font-medium);
        color: var(--foreground);
      }

      .status {
        @include text("xs");
        color: var(--muted-foreground);

        &.pending {
          font-style: italic;
        }
      }
    }

    .description-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-2);
    }
  }
}
</style>
