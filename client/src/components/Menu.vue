<script setup>
import AboutDialog from "#src/components/AboutDialog.vue"
import Icon from "#src/components/common/Icon.vue"
import ImageSearcher from "#src/components/ImageSearcher.vue"
import ThemeToggler from "#src/components/ThemeToggler.vue"
import { useMenu } from "#src/composables/useMenu"
import { useSettings } from "#src/composables/useSettings"
import { useAuthStore } from "#src/stores/auth"
import { useImagesStore } from "#src/stores/images"
import gsap from "gsap"
import { computed, markRaw, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const imagesStore = useImagesStore()
const { settings } = useSettings()
const { hide, isVisible, shouldAnimate } = useMenu("menu")

const canFocus = computed(() => isVisible.value && !isMenuAnimating.value)

const menu = useTemplateRef("menu")
const menuUl = useTemplateRef("menu-ul")
const activeIndicator = useTemplateRef("active-indicator")

const isLoggedIn = computed(() => authStore && !!authStore.user)
const isAdmin = computed(() => isLoggedIn.value && authStore.user.admin)
const isAnimating = ref(false)
const isMenuAnimating = ref(false)
const sortIcon = ref("Shuffle")

const toggleSort = () => {
  const sortButton = menuUl.value?.querySelector('[data-item-id="sort-toggler"]')
  const iconElement = sortButton?.querySelector(".icon")

  if (imagesStore.orderBy === null) {
    sortIcon.value = "Calendar"
    imagesStore.setOrder({ orderBy: "date" })
  } else {
    sortIcon.value = "Shuffle"
    imagesStore.setOrder({ orderBy: null })
  }

  if (iconElement) {
    gsap.set(iconElement, { rotation: -90 })
    gsap.to(iconElement, {
      duration: 0.4,
      ease: "back.out(1.5)",
      rotation: 0
    })
  }
}

const menuConfig = reactive({
  center: [
    {
      action: toggleSort,
      icon: sortIcon,
      id: "sort-toggler",
      visible: true
    },
    {
      component: markRaw(ImageSearcher),
      id: "image-searcher",
      props: { menu },
      visible: () => !!menu.value
    },
    {
      component: markRaw(ThemeToggler),
      id: "theme-toggler",
      props: {},
      visible: true
    },
    {
      component: markRaw(AboutDialog),
      id: "about-dialog",
      props: {},
      visible: () => settings.value?.showAboutDialog && settings.value?.aboutDialogDescription
    }
  ],
  left: [],
  right: [
    {
      icon: "LogIn",
      id: "login",
      path: "/login",
      visible: () => settings.value?.showLoginLink && !isLoggedIn.value
    },
    {
      icon: "Settings",
      id: "dashboard",
      path: "/dashboard",
      visible: () => isAdmin.value
    }
  ]
})

const visibleMenuItems = computed(() => {
  const result = {
    center: [],
    left: [],
    right: []
  }

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
    animateIndicator(item.id)
  }

  if (item.action) {
    item.action()
  } else if (item.path) {
    router.push(item.path)
  }
}

const animateIndicator = (itemId) => {
  const targetElement = menuUl.value?.querySelector(`[data-item-id="${itemId}"]`)

  if (!targetElement || !activeIndicator.value) return

  const buttonElement = targetElement.querySelector("button")
  if (!buttonElement) return

  isAnimating.value = true

  const buttonRect = buttonElement.getBoundingClientRect()
  const containerRect = menuUl.value.getBoundingClientRect()

  const targetX = buttonRect.left - containerRect.left
  const targetY = buttonRect.top - containerRect.top
  const targetWidth = buttonRect.width
  const targetHeight = buttonRect.height

  gsap.to(activeIndicator.value, {
    duration: 0.3,
    ease: "back.out(1)",
    height: targetHeight,
    onComplete: () => {
      isAnimating.value = false
    },
    width: targetWidth,
    x: targetX,
    y: targetY
  })
}

const isActive = (path) => {
  if (!path) return false
  if (path === "/") {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}

const initializeIndicator = async () => {
  await nextTick()

  const activeItem = visibleMenuItems.value.center.find(
    (item) => item.hasIndicator && isActive(item.path)
  )

  if (activeItem) {
    const targetElement = menuUl.value?.querySelector(`[data-item-id="${activeItem.id}"]`)
    const indicator = activeIndicator.value

    if (targetElement && indicator) {
      const buttonElement = targetElement.querySelector("button")
      if (!buttonElement) return

      const buttonRect = buttonElement.getBoundingClientRect()
      const containerRect = menuUl.value.getBoundingClientRect()

      const targetX = buttonRect.left - containerRect.left
      const targetY = buttonRect.top - containerRect.top
      const targetWidth = buttonRect.width
      const targetHeight = buttonRect.height

      gsap.set(indicator, {
        height: targetHeight,
        opacity: 1,
        width: targetWidth,
        x: targetX,
        y: targetY
      })
    }
  }
}

const animateMenuVisibility = () => {
  if (!menu.value || !shouldAnimate.value) return

  isMenuAnimating.value = true

  if (isVisible.value) {
    gsap.fromTo(
      menu.value,
      {
        opacity: 0,
        y: -100
      },
      {
        duration: 0.4,
        ease: "back.out(1.2)",
        onComplete: () => {
          isMenuAnimating.value = false
        },
        opacity: 1,
        y: 0
      }
    )
  } else {
    gsap.to(menu.value, {
      duration: 0.3,
      ease: "back.in(1.2)",
      onComplete: () => {
        isMenuAnimating.value = false
      },
      opacity: 0,
      y: -100
    })
  }
}

onMounted(() => {
  initializeIndicator()
})

watch(
  isVisible,
  () => {
    if (shouldAnimate.value) {
      animateMenuVisibility()
    }
  },
  { immediate: false }
)

watch(
  () => route.path,
  () => {
    setTimeout(() => {
      if (isAnimating.value) return
      initializeIndicator()
    }, 50)
  }
)

watch(
  () => route.path,
  (newPath) => {
    if (newPath !== "/") {
      hide()
    }
  },
  { immediate: true }
)
</script>

<template>
  <aside
    ref="menu"
    class="menu"
    :class="{
      'menu-hidden': !isVisible && !shouldAnimate,
      'menu-animating': isMenuAnimating
    }"
    :style="{ display: !isVisible && !shouldAnimate ? 'none' : 'flex' }"
  >
    <div class="menu-inner inner">
      <ul ref="menu-ul">
        <div ref="active-indicator" class="active-indicator"></div>

        <template v-for="item in visibleMenuItems.left" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              :is="item.component"
              v-if="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
              @click="handleItemClick(item)"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="18" />
              <span v-if="item.label" class="text">{{ item.label }}</span>
            </button>
          </li>
        </template>

        <div v-if="visibleMenuItems.left.length > 0" class="divider"></div>

        <template v-for="item in visibleMenuItems.center" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              :is="item.component"
              v-if="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
              @click="handleItemClick(item)"
            >
              <Icon v-if="item.icon" :name="item.icon" :size="18" />
              <span v-if="item.label" class="text">{{ item.label }}</span>
            </button>
          </li>
        </template>

        <div v-if="visibleMenuItems.right.length > 0" class="divider"></div>

        <template v-for="item in visibleMenuItems.right" :key="item.id">
          <li :class="{ active: isActive(item.path) }" :data-item-id="item.id">
            <component
              :is="item.component"
              v-if="item.component"
              v-bind="item.props || {}"
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
              @click="handleItemClick(item)"
            />
            <button
              v-else
              :class="item.className"
              :tabindex="canFocus ? 0 : -1"
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
  border-radius: calc(var(--radius-lg) + var(--spacing-2));
  border: 1px solid var(--border);
  transform-origin: bottom;
  backdrop-filter: blur(5px);
  padding: var(--spacing-2);
  z-index: z(menu);
  transition: none;

  .inner {
    width: 100%;
    // pointer-events: none;
  }

  &.menu-hidden {
    pointer-events: none;
    opacity: 0;
  }

  &.menu-animating {
    pointer-events: none;
  }

  ul {
    list-style: none;
    display: flex;
    align-items: center;
    align-items: center;
    position: relative;
    gap: var(--spacing-1);
  }

  .divider {
    width: 1px;
    height: 20px;
    background-color: var(--border);
    margin: 0 var(--spacing-1);
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
    transition: none;
    transform-origin: center;
  }

  li {
    z-index: 2;
    border-radius: var(--radius-md);

    > button {
      @include flex-center;
      border: none;
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      width: 100%;
      height: 2.25rem;
      width: 2.75rem;

      background: none;
      cursor: pointer;
      color: inherit;
      @include text("base");
      font-weight: var(--font-normal);
      text-transform: uppercase;
    }
  }
}
</style>
