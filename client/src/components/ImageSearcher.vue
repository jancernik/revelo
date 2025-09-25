<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useElementRect } from "#src/composables/useElementRect"
import { useImagesStore } from "#src/stores/images"
import { gsap } from "gsap"
import { computed, ref, useTemplateRef } from "vue"

const props = defineProps({
  menu: { required: true, type: Object }
})

const imagesStore = useImagesStore()
const isSearchExpanded = ref(false)
const searchValue = ref("")

const searchButton = useTemplateRef("search-button")
const searchInput = useTemplateRef("search-input")
const searchInputContainer = useTemplateRef("search-input-container")

const { width: searchButtonWidth, x: searchButtonX } = useElementRect(searchButton)
const { x: menuX } = useElementRect(props.menu)

const menuOffset = computed(() => {
  const style = getComputedStyle(props.menu)
  return parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth)
})

const searchButtonOffset = computed(() => -searchButtonX.value + menuX.value + menuOffset.value)

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
  const animateIn = { filter: "blur(0px)", opacity: 1 }
  const animateOut = { filter: "blur(15px)", opacity: 0 }

  if (visible) {
    tl.to(staggeredElements, { ...animateOut, stagger: 0.03 }, 0)
    tl.to(nonStaggeredElements, { ...animateOut }, 0)
    gsap.set(menuListItems, { pointerEvents: "none" })
    gsap.set(searchInputContainer.value, { pointerEvents: "auto" })

    tl.to(searchInputElements, { ...animateIn, duration: 0.3, stagger: 0.05 }, 0.2)
    tl.to(
      searchButton.value,
      { duration: 0.3, ease: "power2.inOut", x: searchButtonOffset.value },
      0
    )
  } else {
    tl.to(staggeredElements, { ...animateIn, stagger: 0.03 }, 0)
    tl.to(nonStaggeredElements, { ...animateIn }, 0)
    gsap.set(menuListItems, { pointerEvents: "auto" })
    gsap.set(searchInputContainer.value, { pointerEvents: "none" })

    tl.to(searchInputElements, { ...animateOut, duration: 0.3, stagger: -0.05 }, 0)
    tl.to(searchButton.value, { duration: 0.3, ease: "power2.inOut", x: 0 }, 0)
  }
}

const showSearchInput = (callback) => animateSearchInput(true, callback)
const hideSearchInput = (callback) => animateSearchInput(false, callback)

const expandSearch = () => {
  if (isSearchExpanded.value) return
  isSearchExpanded.value = true
  showSearchInput()
  searchInput.value?.focus()
}

const collapseSearch = () => {
  if (!isSearchExpanded.value) return
  isSearchExpanded.value = false
  hideSearchInput()
  searchInput.value?.blur()
  imagesStore.search("")
  searchValue.value = ""
}

const handleInput = (event) => {
  searchValue.value = event.target.value
  imagesStore.search(event.target.value)
}

const handleBlur = () => {
  if (!searchValue.value.trim()) collapseSearch()
}
</script>

<template>
  <div ref="search-container" class="image-searcher">
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
        :style="{ paddingLeft: searchButtonWidth + menuOffset + 'px' }"
        @blur="handleBlur"
        @input="handleInput"
      />

      <button ref="clear-button" class="clear-button" @click="collapseSearch">
        <Icon name="X" class="clear-icon" :size="18" />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.image-searcher {
  padding-inline: var(--spacing-2);

  .search-button {
    @include flex-center;
    width: 2.25rem;
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
  }

  .search-input {
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
