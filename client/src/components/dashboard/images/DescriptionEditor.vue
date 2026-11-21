<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"

import type { DescriptionSource, ImageDescription } from "#src/types/models"

import Button from "#src/components/common/Button.vue"
import Input from "#src/components/common/Input.vue"
import { useToast } from "#src/composables/useToast"
import { useImagesStore } from "#src/stores/images"

const props = defineProps<{ imageId: string }>()

const MAX_LENGTH = 500
const POLL_INTERVAL_MS = 4000
const SOURCE_LABELS: Record<DescriptionSource, string> = {
  edited: "Edited",
  generated: "Generated",
  translated: "Translated"
}

const imagesStore = useImagesStore()
const { show: showToast } = useToast()
const languageNames = new Intl.DisplayNames(["en"], { type: "language" })

const descriptions = ref<ImageDescription[]>([])
const drafts = ref<Record<string, string>>({})
const busy = ref<null | string>(null)
let pollTimer: ReturnType<typeof setTimeout> | undefined
// Counts requests, so a response is applied only while it is the latest one.
let latest = 0

const rows = computed(() =>
  descriptions.value.map((item) => {
    const draft = (drafts.value[item.language] ?? "").trim()
    return {
      ...item,
      changed: draft !== "" && draft !== (item.text ?? ""),
      label: languageNames.of(item.language) ?? item.language,
      status: item.source ? SOURCE_LABELS[item.source] : "Pending"
    }
  })
)

// A draft follows the server text until the user changes it.
const apply = (list: ImageDescription[]) => {
  const previous = new Map(descriptions.value.map((item) => [item.language, item.text ?? ""]))
  for (const item of list) {
    const draft = drafts.value[item.language]
    if (draft === undefined || draft === (previous.get(item.language) ?? "")) {
      drafts.value[item.language] = item.text ?? ""
    }
  }
  descriptions.value = list
  schedulePoll()
}

const stopPolling = () => {
  clearTimeout(pollTimer)
  pollTimer = undefined
}

const schedulePoll = () => {
  stopPolling()
  if (!descriptions.value.some((item) => item.source === null)) return

  pollTimer = setTimeout(() => void refresh(), POLL_INTERVAL_MS)
}

const refresh = async () => {
  const request = ++latest
  try {
    const list = await imagesStore.fetchDescriptions(props.imageId)
    if (request === latest) apply(list)
  } catch {
    // error handled by store
  }
}

const run = async (
  language: string,
  action: () => Promise<ImageDescription[]>,
  success: string
) => {
  const request = ++latest
  stopPolling()
  busy.value = language
  try {
    const list = await action()
    if (request === latest) {
      delete drafts.value[language]
      apply(list)
    }
    showToast({ description: success, title: "Description Updated", type: "success" })
  } catch {
    // error handled by store
    if (request === latest) schedulePoll()
  } finally {
    busy.value = null
  }
}

const save = (row: (typeof rows.value)[number]) =>
  run(
    row.language,
    () =>
      imagesStore.updateDescription(
        props.imageId,
        row.language,
        (drafts.value[row.language] ?? "").trim()
      ),
    `${row.label} description saved.`
  )

const regenerate = (row: (typeof rows.value)[number]) =>
  run(
    row.language,
    () => imagesStore.regenerateDescriptions(props.imageId, [row.language]),
    `${row.label} description will be generated again.`
  )

onMounted(refresh)

onUnmounted(() => {
  latest++
  stopPolling()
})
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
