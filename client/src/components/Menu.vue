<script setup>
import Icon from "#src/components/common/Icon.vue"
import Input from "#src/components/common/Input.vue"
import ThemeToggler from "#src/components/ThemeToggler.vue"
import { useAuthStore } from "#src/stores/auth"
import { useImagesStore } from "#src/stores/images"
import { cssVar } from "#src/utils/helpers"
import gsap from "gsap"
import { computed, markRaw, nextTick, onMounted, reactive, useTemplateRef, watch, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const imagesStore = useImagesStore()

const isAdmin = computed(() => authStore && !!authStore.user?.admin)

const menu = useTemplateRef("menu")
const menuUl = useTemplateRef("menu-ul")
const activeIndicator = useTemplateRef("active-indicator")
const searchInput = useTemplateRef("search-input")

const isSearchExpanded = ref(false)
const isMenuVisible = ref(true)

const menuConfig = reactive({
  left: [
    {
      id: "search",
      icon: "Search",
      visible: true,
      action: () => toggleSearch()
    },
    {
      id: "theme-toggler",
      component: markRaw(ThemeToggler),
      visible: true,
      props: {}
    }
  ],
  center: [
    {
      id: "gallery",
      label: "Gallery",
      icon: "Images",
      path: "/",
      visible: true,
      hasIndicator: true
    },
    {
      id: "collections",
      label: "Collections",
      icon: "FolderOpen",
      path: "/collections",
      visible: true,
      hasIndicator: true
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "Settings",
      path: "/dashboard",
      visible: () => isAdmin.value,
      hasIndicator: true
    }
  ],
  right: []
})

const visibleMenuItems = computed(() => {
  const result = {
    left: [],
    center: [],
    right: []
  }

  // Process each section
  Object.keys(menuConfig).forEach((key) => {
    const section = menuConfig[key]
    if (Array.isArray(section)) {
      result[key] = section.filter((item) => {
        const isVisible = typeof item.visible === "function" ? item.visible() : item.visible
        return isVisible
      })
    }
  })

  return result
})

const handleItemClick = (item) => {
  if (item.hasIndicator) {
    animateIndicatorTo(item.id)
  }

  if (item.action) {
    item.action()
  } else if (item.path) {
    // Prevent navigation if we're already on this path
    if (route.path !== item.path) {
      router.push(item.path)
    }
  }
}

const animateIndicatorTo = (itemId) => {
  requestAnimationFrame(() => {
    const targetElement = menuUl.value?.querySelector(`[data-item-id="${itemId}"]`)
    const indicator = activeIndicator.value

    if (!targetElement || !indicator) return

    // Get the button element inside the li
    const buttonElement = targetElement.querySelector('button')
    if (!buttonElement) return

    const buttonRect = buttonElement.getBoundingClientRect()
    const containerRect = menuUl.value.getBoundingClientRect()

    const targetX = buttonRect.left - containerRect.left
    const targetY = buttonRect.top - containerRect.top
    const targetWidth = buttonRect.width
    const targetHeight = buttonRect.height

    gsap.to(indicator, {
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
      duration: 0.3,
      ease: "power2.out"
    })
  })
}

const isActive = (path) => {
  if (!path) return false
  if (path === "/") {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}

const toggleSearch = () => {
  isSearchExpanded.value = !isSearchExpanded.value

  if (isSearchExpanded.value) {
    // Expand search input
    nextTick(() => {
      searchInput.value?.focus()
      animateSearchExpansion(true)
    })
  } else {
    // Collapse search input
    animateSearchExpansion(false)
  }
}

const animateSearchExpansion = (expand) => {
  const searchElement = searchInput.value
  const menuElement = menu.value
  const searchButton = menuUl.value?.querySelector('[data-item-id="search"]')

  if (!searchElement || !menuElement) return

  if (expand) {
    // Get search button position
    const searchButtonRect = searchButton?.getBoundingClientRect()
    const menuRect = menuElement.getBoundingClientRect()

    if (searchButtonRect) {
      // Start from search button position
      const startX = searchButtonRect.left - menuRect.left
      const targetWidth = menuRect.width - 32 // Account for padding

      // Set initial position at search button
      gsap.set(searchElement, {
        left: startX,
        width: searchButtonRect.width
      })

      // Animate to full width from search button position
      gsap.to(searchElement, {
        left: 16, // Match padding
        width: targetWidth,
        duration: 0.4,
        ease: "power2.out"
      })
    }
  } else {
    // Get search button position for collapse animation
    const searchButtonRect = searchButton?.getBoundingClientRect()
    const menuRect = menuElement.getBoundingClientRect()

    if (searchButtonRect) {
      const endX = searchButtonRect.left - menuRect.left

      gsap.to(searchElement, {
        left: endX,
        width: searchButtonRect.width,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          // Clear search when closing
          if (searchElement) {
            searchElement.value = ''
            imagesStore.search('')
          }
        }
      })
    }
  }
}

const handleSearch = (event) => {
  const query = event.target.value
  imagesStore.search(query)
}

const handleSearchKeydown = (event) => {
  if (event.key === 'Escape') {
    toggleSearch()
  }
}

const handleSearchBlur = () => {
  // Small delay to allow for potential refocus
  setTimeout(() => {
    if (isSearchExpanded.value && searchInput.value !== document.activeElement) {
      toggleSearch()
    }
  }, 100)
}

const initializeIndicator = async () => {
  await nextTick()

  // Find the currently active item
  const activeItem = visibleMenuItems.value.center.find(item =>
    item.hasIndicator && isActive(item.path)
  )

  if (activeItem) {
    requestAnimationFrame(() => {
      // Set initial position without animation
      const targetElement = menuUl.value?.querySelector(`[data-item-id="${activeItem.id}"]`)
      const indicator = activeIndicator.value

      if (targetElement && indicator) {
        // Get the button element inside the li
        const buttonElement = targetElement.querySelector('button')
        if (!buttonElement) return

        const buttonRect = buttonElement.getBoundingClientRect()
        const containerRect = menuUl.value.getBoundingClientRect()

        const targetX = buttonRect.left - containerRect.left
        const targetY = buttonRect.top - containerRect.top
        const targetWidth = buttonRect.width
        const targetHeight = buttonRect.height

        gsap.set(indicator, {
          x: targetX,
          y: targetY,
          width: targetWidth,
          height: targetHeight,
          opacity: 1
        })
      }
    })
  }
}

onMounted(() => {
  initializeIndicator()
})

watch(() => route.path, () => {
  // Small delay to ensure DOM is updated after route change
  setTimeout(() => {
    initializeIndicator()
  }, 50)
})

// Menu show/hide API
const showMenu = () => {
  if (isMenuVisible.value) return

  isMenuVisible.value = true
  const menuElement = menu.value

  if (menuElement) {
    gsap.to(menuElement, {
      y: 0,
      duration: 0.3,
      ease: "power2.out"
    })
  }
}

const hideMenu = () => {
  if (!isMenuVisible.value) return

  const menuElement = menu.value

  if (menuElement) {
    // First close search if it's open
    if (isSearchExpanded.value) {
      isSearchExpanded.value = false
      animateSearchExpansion(false)
    }

    // Get menu height to slide it completely out of view
    const menuRect = menuElement.getBoundingClientRect()
    const hideDistance = -(menuRect.height + 20) // Extra offset to ensure it's fully hidden

    gsap.to(menuElement, {
      y: hideDistance,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        isMenuVisible.value = false
      }
    })
  }
}

const toggleMenu = () => {
  if (isMenuVisible.value) {
    hideMenu()
  } else {
    showMenu()
  }
}

// Expose API for external components
defineExpose({
  showMenu,
  hideMenu,
  toggleMenu,
  isVisible: () => isMenuVisible.value
})
</script>

<template>
  <aside ref="menu" class="menu" :class="{ 'menu-hidden': !isMenuVisible }">
    <div class="menu-inner inner">
      <!-- Search Input Overlay -->
      <input
        v-show="isSearchExpanded"
        ref="search-input"
        type="text"
        placeholder="Search images..."
        class="search-input"
        @input="handleSearch"
        @keydown="handleSearchKeydown"
        @blur="handleSearchBlur"
      />

      <ul ref="menu-ul" :class="{ 'search-hidden': isSearchExpanded }">
        <!-- Active Indicator -->
        <div ref="active-indicator" class="active-indicator"></div>

        <!-- Left Section -->
        <template v-for="item in visibleMenuItems.left" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              v-if="item.component"
              :is="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              @click="handleItemClick(item)"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="18" />
              <span v-if="item.label" class="text">{{ item.label }}</span>
            </button>
          </li>
        </template>

        <div v-if="visibleMenuItems.left.length > 0" class="divider"></div>

        <!-- Center Section -->
        <template v-for="item in visibleMenuItems.center" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              v-if="item.component"
              :is="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              @click="handleItemClick(item)"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="18" />
              <span v-if="item.label" class="text">{{ item.label }}</span>
            </button>
          </li>
        </template>

        <div v-if="visibleMenuItems.right.length > 0" class="divider"></div>

        <!-- Right Section -->
        <template v-for="item in visibleMenuItems.right" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              v-if="item.component"
              :is="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              @click="handleItemClick(item)"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="18" />
              <span v-if="item.label" class="text">{{ item.label }}</span>
            </button>
          </li>
        </template>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss">
.menu {
  @include flex-center;
  background-color: var(--menu-background);
  position: fixed;
  top: var(--spacing-4);
  left: 50%;
  transform: translateX(-50%);
  border-radius: calc(var(--radius-lg) + var(--spacing-2));
  border: 1px solid var(--border);
  backdrop-filter: blur(5px);
  z-index: z(menu);
  transition: none; // GSAP handles animations

  &.menu-hidden {
    pointer-events: none;
  }

  // .theme {
    // @include flex-center;
  // }
  ul {
    list-style: none;
    display: flex;
    align-items: center;
    padding: var(--spacing-2);
    position: relative;
  }

  .divider {
    width: 1px;
    height: 20px;
    background-color: var(--border);
    margin: 0 var(--spacing-2);
  }

  .active-indicator {
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--menu-active);
    border-radius: var(--radius-md);
    opacity: 0;
    z-index: 1;
    pointer-events: none;
    transition: none; // GSAP will handle transitions
    transform-origin: center;
  }

  li {
    position: relative;
    z-index: 2;
    border-radius: var(--radius-md);
  }

  // Remove the old active background since indicator handles it
  li.active {
    // background-color: var(--menu-active);
  }

  .search-input {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: calc(100% - var(--spacing-4));
    border: none;
    background: var(--menu-background);
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    outline: none;
    z-index: 10;
    border-radius: var(--radius-md);
    padding: 0 var(--spacing-3);
    border: 1px solid var(--border);

    &::placeholder {
      color: var(--text-muted);
    }
  }

  ul.search-hidden {
    opacity: 0.3;
    pointer-events: none;
  }

  button {
    border: none;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-2) var(--spacing-4);
    background: none;
    cursor: pointer;
    color: inherit;
    @include text("base");
    font-weight: var(--font-normal);
    text-transform: uppercase;
  }
}
</style>
