<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useElementRect } from "#src/composables/useElementRect"
import { useMenu } from "#src/composables/useMenu"
import { useWindowSize } from "#src/composables/useWindowSize"
import { useImagesStore } from "#src/stores/images"
import { gsap } from "gsap"
import { computed, ref, useTemplateRef } from "vue"

const props = defineProps({
  menu: { required: true, type: Object }
})

const imagesStore = useImagesStore()
const { cancelPendingHide, flushSearchCollapseCallback } = useMenu()
const isSearchExpanded = ref(false)
const searchValue = ref("")

const searchButton = useTemplateRef("search-button")
const searchInput = useTemplateRef("search-input")
const searchInputContainer = useTemplateRef("search-input-container")
const clearButton = useTemplateRef("clear-button")

const { width: searchButtonWidth } = useElementRect(searchButton)
const { width: windowWidth } = useWindowSize()

const maxSearchWidth = computed(() => Math.min(windowWidth.value - 32, 400))

let initialWidth = 0

const menuOffset = computed(() => {
  const style = getComputedStyle(props.menu)
  return parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth)
})

const createAnimationTimeline = (options = {}) => {
  return gsap.timeline({
    defaults: {
      duration: 0.5,
      ease: "power2.out"
    },
    ...options
  })
}

const animateSearchInput = (visible, callback) => {
  const tl = createAnimationTimeline({
    onComplete: () => callback?.()
  })

  const staggeredElements = ".menu .icon:not(.search-icon, .clear-icon), .menu .text"
  const nonStaggeredElements = ".menu .divider, .menu .active-indicator"
  const searchInputElements = ".search-input, .clear-button"
  const menuListItems = ".menu li:not(:has(.image-searcher))"
  const menuButtons = ".menu button:not(.clear-button)"
  const animateIn = { filter: "blur(0px)", opacity: 1 }
  const animateOut = { filter: "blur(15px)", opacity: 0 }

  if (visible) {
    const menuRect = props.menu.getBoundingClientRect()
    const buttonRect = searchButton.value.getBoundingClientRect()
    const menuStyle = getComputedStyle(props.menu)
    const padding = parseFloat(menuStyle.paddingLeft)
    const border = parseFloat(menuStyle.borderLeftWidth)
    const currentOffset = -buttonRect.left + menuRect.left + padding + border
    const inputPadding = buttonRect.width + padding + border - 1

    initialWidth = menuRect.width

    tl.to(".menu", { width: maxSearchWidth.value })
    tl.to(staggeredElements, { ...animateOut, stagger: 0.03 }, 0)
    tl.to(nonStaggeredElements, { ...animateOut }, 0)
    gsap.set(menuListItems, { pointerEvents: "none" })
    gsap.set(searchInputContainer.value, { pointerEvents: "auto" })
    gsap.set(searchInput.value, { paddingLeft: inputPadding })

    tl.to(searchInputElements, { ...animateIn, duration: 0.3, stagger: 0.05 }, 0.2)
    tl.to(searchButton.value, { duration: 0.3, ease: "power2.inOut", x: currentOffset }, 0)
    document.querySelectorAll(menuButtons).forEach((b) => (b.tabIndex = -1))
  } else {
    tl.to(".menu", { width: initialWidth })
    tl.to(staggeredElements, { ...animateIn, stagger: 0.03 }, 0)
    tl.to(nonStaggeredElements, { ...animateIn }, 0)
    gsap.set(menuListItems, { pointerEvents: "auto" })
    gsap.set(searchInputContainer.value, { pointerEvents: "none" })

    tl.to(searchInputElements, { ...animateOut, duration: 0.3, stagger: -0.05 }, 0)
    tl.to(searchButton.value, { duration: 0.3, ease: "power2.inOut", x: 0 }, 0)
    document.querySelectorAll(menuButtons).forEach((b) => (b.tabIndex = 0))
  }
}

const showSearchInput = (callback) => animateSearchInput(true, callback)
const hideSearchInput = (callback) => animateSearchInput(false, callback)

const expandSearch = () => {
  if (isSearchExpanded.value) return
  isSearchExpanded.value = true
  cancelPendingHide()
  showSearchInput()
  searchInput.value?.focus()
}

const collapseSearch = () => {
  if (!isSearchExpanded.value) return
  isSearchExpanded.value = false
  cancelPendingHide()
  searchInput.value?.blur()
  clearButton.value?.blur()
  imagesStore.search("")
  hideSearchInput(() => {
    searchValue.value = ""
  })
  flushSearchCollapseCallback()
}

const handleInput = (event) => {
  searchValue.value = event.target.value
  imagesStore.search(event.target.value)
}

const handleBlur = (event) => {
  if (!searchValue.value.trim() && event.relatedTarget !== clearButton.value) {
    collapseSearch()
  }
}

const handleFocusOut = (event) => {
  if (!isSearchExpanded.value) return
  if (props.menu.value?.contains(event.relatedTarget)) return
  cancelPendingHide()
  flushSearchCollapseCallback()
}
</script>

<template>
  <div ref="search-container" class="image-searcher" @focusout="handleFocusOut">
    <button ref="search-button" class="search-button" @click="expandSearch">
      <Icon name="Search" :size="18" class="search-icon" />
    </button>

    <div ref="search-input-container" class="search-input-container">
      <input
        ref="search-input"
        v-model="searchValue"
        type="text"
        class="search-input"
        placeholder="Search images..."
        :tabindex="isSearchExpanded ? 0 : -1"
        :style="{ paddingLeft: searchButtonWidth + menuOffset - 1 + 'px' }"
        @blur="handleBlur"
        @keydown.esc.prevent="collapseSearch"
        @input="handleInput"
      />

      <button
        ref="clear-button"
        class="clear-button"
        :tabindex="isSearchExpanded ? 0 : -1"
        @click="collapseSearch"
      >
        <Icon name="X" class="clear-icon" :size="18" />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.image-searcher {
  .search-button {
    @include flex-center;
    width: 2.75rem;
    height: 2.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--foreground);
  }

  .search-input-container {
    display: flex;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    // flex: 1 1 auto;
  }

  .search-input {
    // flex: 1 1 auto;
    height: 100%;
    border: none;
    background: transparent;
    outline: none;
    color: inherit;
    @include text("sm");
    opacity: 0;
    width: 100%;

    &::placeholder {
      color: var(--muted-foreground);
    }
  }

  .clear-button {
    @include flex-center;
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    opacity: 0;
  }
}
</style>
