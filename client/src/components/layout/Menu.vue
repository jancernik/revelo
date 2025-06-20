<script setup>
import gsap from 'gsap'
import { computed, nextTick, onMounted, reactive, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ThemeToggler from '@/components/ThemeToggler.vue'
import { useAuthStore } from '@/stores/auth'
import { cssVar } from '@/utils/ui'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore && !!authStore.user?.admin)

const menu = useTemplateRef('menu')
const menuUl = useTemplateRef('menu-ul')

let enterTimeline = null
let leaveTimeline = null

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}

const menuConfig = reactive([
  {
    id: 'gallery',
    label: 'Gallery',
    path: '/',
    visible: true
  },
  {
    id: 'collections',
    label: 'Collections',
    path: '/collections',
    visible: true
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    visible: () => isAdmin.value
  }
])

const visibleMenuItems = computed(() => {
  return menuConfig.filter((item) => {
    if (typeof item.visible === 'function') {
      return item.visible()
    }
    return item.visible
  })
})

const handleItemClick = (item) => {
  if (item.action) {
    item.action()
  } else if (item.path) {
    router.push(item.path)
  }
}

const isActive = (path) => {
  if (!path) return false
  if (path === '/') {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}

const handleMouseEnter = () => {
  leaveTimeline.pause()
  enterTimeline.restart()
}

const handleMouseLeave = () => {
  enterTimeline.pause()
  leaveTimeline.restart()
}

const initAnimation = () => {
  enterTimeline = gsap.timeline({ paused: true })

  enterTimeline
    .to(menu.value, {
      borderRadius: `${cssVar('--radius-xl')}`,
      duration: 0.45,
      ease: 'back.out(2.2)',
      scale: 1.03,
      y: `-${cssVar('--spacing-6')}`
    })
    .to(
      menuUl.value,
      {
        duration: 0.15,
        ease: 'power1.out',
        gap: `${cssVar('--spacing-4')}`
      },
      '<'
    )
    .to(
      '.list-item button',
      {
        duration: 0.15,
        ease: 'power1.out',
        padding: `${cssVar('--spacing-3')} ${cssVar('--spacing-4')}`
      },
      '<'
    )

  leaveTimeline = gsap.timeline({ paused: true })
  leaveTimeline
    .to(menu.value, {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      duration: 0.15,
      ease: 'power2.out',
      scale: 1,
      y: 0
    })
    .to(
      menuUl.value,
      {
        duration: 0.1,
        ease: 'power1.out',
        gap: 0
      },
      '<'
    )
    .to(
      '.list-item button',
      {
        duration: 0.1,
        ease: 'power4.out',
        padding: `${cssVar('--spacing-2')} ${cssVar('--spacing-4')}`
      },
      '<'
    )
    .to(
      menu.value,
      {
        duration: 0.07,
        repeat: 1,
        scaleX: 1.03,
        scaleY: 0.92,
        yoyo: true
      },
      '-=0.07'
    )
}

onMounted(() => {
  nextTick(initAnimation)
})
</script>

<template>
  <aside ref="menu" class="menu" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <div class="menu-inner inner">
      <ul ref="menu-ul">
        <li
          v-for="item in visibleMenuItems"
          :key="item.id"
          :class="{ active: isActive(item.path) }"
        >
          <div class="list-item">
            <button :class="item.className" @click="handleItemClick(item)">
              <span class="text">{{ item.label }}</span>
            </button>
          </div>
        </li>
        <li class="theme">
          <ThemeToggler />
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss">
.menu {
  @include flex-center;
  background-color: var(--menu-background);
  position: fixed;
  bottom: -1px;
  border-radius: calc(var(--radius-lg) + var(--spacing-2));
  border: 1px solid var(--border);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  transform-origin: bottom;
  backdrop-filter: blur(5px);

  &::before {
    content: '';
    position: absolute;
    top: calc(-1 * var(--spacing-8));
    left: calc(-1 * var(--spacing-8));
    width: calc(100% + var(--spacing-8) * 2);
    height: 300%;
    z-index: -1;
    border-radius: calc(var(--radius-lg) + var(--spacing-2) + var(--spacing-8));
  }
  .theme {
    @include flex-center;
  }
  ul {
    list-style: none;
    display: flex;
    padding: var(--spacing-2);
  }

  li {
    border-radius: var(--radius-md);
  }

  li.active {
    background-color: var(--menu-active);
  }

  button {
    border: none;
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-2) var(--spacing-4);
    background: none;
    cursor: pointer;
    color: inherit;
    @include text('base');
    font-weight: var(--font-normal);
    text-transform: uppercase;
  }
}
</style>
