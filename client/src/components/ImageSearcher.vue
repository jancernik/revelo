<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useImagesStore } from "#src/stores/images"
import { gsap } from "gsap"
import { ref, useTemplateRef } from "vue"

const imagesStore = useImagesStore()

const searchButton = useTemplateRef("search-button")
const searchInput = useTemplateRef("search-input")
const clearButton = useTemplateRef("clear-button")
const searchContainer = useTemplateRef("search-container")

const isSearchExpanded = ref(false)
const searchValue = ref("")

const emit = defineEmits(["search-expand", "search-collapse"])

const handleSearch = (event) => {
  searchValue.value = event.target.value
  imagesStore.search(event.target.value)
}

const expandSearch = () => {
  if (isSearchExpanded.value) return

  isSearchExpanded.value = true
  emit("search-expand")

  // Focus the input after expansion animation completes
  setTimeout(() => {
    searchInput.value?.focus()
  }, 300)
}

const collapseSearch = () => {
  if (!isSearchExpanded.value) return

  isSearchExpanded.value = false
  searchInput.value?.blur()
  emit("search-collapse")
}

const clearSearch = () => {
  searchValue.value = ""
  imagesStore.search("")
  searchInput.value?.focus()
}

const handleInputBlur = () => {
  // Small delay to allow click on clear button
  setTimeout(() => {
    if (!searchValue.value.trim()) {
      collapseSearch()
    }
  }, 100)
}

defineExpose({
  expandSearch,
  collapseSearch
})
</script>

<template>
  <div ref="search-container" class="image-searcher-container">
    <button
      ref="search-button"
      class="image-searcher"
      @click="expandSearch"
    >
      <Icon name="Search" :size="18" />
    </button>

    <div class="search-input-container">
      <input
        ref="search-input"
        v-model="searchValue"
        type="text"
        class="search-input"
        placeholder="Search images..."
        @input="handleSearch"
        @blur="handleInputBlur"
      />

      <button
        ref="clear-button"
        class="clear-button"
        @click="clearSearch"
        v-show="searchValue.length > 0"
      >
        <Icon name="X" :size="14" />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.image-searcher-container {
  position: relative;
  display: flex;
  align-items: center;
}

.image-searcher {
  @include flex-center;
  width: 2.25rem;
  height: 2.25rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  position: relative;
  z-index: 3;
}

.search-input-container {
  position: absolute;
  top: 0;
  left: 0;
  height: 2.25rem;
  width: 2.25rem; // Start with same width as button
  display: flex;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
}

.search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  color: inherit;
  font-size: 0.875rem;
  padding-left: 2.75rem; // Space for search icon
  padding-right: 2.5rem; // Space for clear button

  &::placeholder {
    color: var(--text-muted);
  }
}

.clear-button {
  @include flex-center;
  position: absolute;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: color 0.2s ease;

  &:hover {
    color: var(--text);
  }
}
</style>
