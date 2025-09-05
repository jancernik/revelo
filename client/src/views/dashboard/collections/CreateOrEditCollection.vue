<script setup>
import Input from "#src/components/common/Input.vue"
import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { useToast } from "#src/composables/useToast"
import { useCollectionsStore } from "#src/stores/collections"
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"

const props = defineProps({
  id: {
    default: null,
    type: String
  }
})

const { show: showToast } = useToast()
const router = useRouter()
const { reset, setFooter, setHeader } = useDashboardLayout()
const collectionsStore = useCollectionsStore()

const isEditing = computed(() => !!props.id)
const loading = ref(false)
const saving = ref(false)

const title = ref("")
const description = ref("")

const loadCollection = async () => {
  if (!props.id) return

  try {
    loading.value = true
    const collection = await collectionsStore.fetch(props.id)
    title.value = collection.title || ""
    description.value = collection.description || ""
  } finally {
    loading.value = false
  }
}

const saveCollection = async () => {
  try {
    saving.value = true
    if (isEditing.value) {
      await collectionsStore.update(props.id, {
        description: description.value,
        title: title.value
      })
      router.push(`/dashboard/collections/${props.id}`)
      showToast({
        description: `Collection updated successfully.`,
        title: "Collection Updated",
        type: "success"
      })
    } else {
      const result = await collectionsStore.create({
        description: description.value,
        title: title.value
      })
      router.push(`/dashboard/collections/${result.data.collection.id}`)
      showToast({
        description: `Collection created successfully.`,
        title: "Collection Created",
        type: "success"
      })
    }
  } finally {
    saving.value = false
  }
}

const cancel = () => {
  if (isEditing.value) {
    router.push(`/dashboard/collections/${props.id}`)
  } else {
    router.push("/dashboard/collections")
  }
}

const setupLayout = () => {
  setHeader({
    title: isEditing.value ? "Edit collection" : "New collection"
  })

  setFooter({
    actions: [
      {
        color: "secondary",
        icon: "X",
        key: "cancel",
        onClick: () => cancel(),
        text: "Cancel"
      },
      {
        color: "primary",
        icon: "Save",
        key: "save",
        onClick: () => saveCollection(),
        text: isEditing.value ? "Save Changes" : "Create Collection"
      }
    ]
  })
}

onMounted(async () => {
  await loadCollection()
  setupLayout()
})

onUnmounted(() => reset())
</script>

<template>
  <div class="collection-form">
    <form v-if="!loading" class="form" @submit.prevent="saveCollection">
      <Input v-model="title" label="Title" :disabled="saving" required />
      <Input v-model="description" label="Description" :disabled="saving" multiline="textarea" />
    </form>
  </div>
</template>

<style lang="scss">
.collection-form {
  @include fill-parent;
  display: flex;
  justify-content: center;

  .form {
    padding: var(--spacing-8);
    gap: var(--spacing-4);
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
  }
}
</style>
