import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'system')
const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
const isAnimating = ref(false)

export function useTheme() {
  const themeClass = computed(() => {
    if (theme.value !== 'system') {
      return theme.value
    }

    return systemPrefersDark.value ? 'dark' : 'light'
  })

  const setTheme = async (newTheme, opts) => {
    if (isAnimating.value) return

    const options = {
      animate: true,
      origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      ...opts
    }
    const oldTheme = themeClass.value
    const newThemeClass =
      newTheme !== 'system' ? newTheme : systemPrefersDark.value ? 'dark' : 'light'

    if (oldTheme === newThemeClass) {
      theme.value = newTheme
      localStorage.setItem('theme', newTheme)
      return
    }

    if (options.animate) {
      await animateThemeTransition(newThemeClass, options.origin)
      theme.value = newTheme
      localStorage.setItem('theme', newTheme)
    } else {
      document.documentElement.classList.add('no-transition')
      document.querySelector('body').style.pointerEvents = 'none'
      await nextTick()
      theme.value = newTheme
      localStorage.setItem('theme', newTheme)
      setTimeout(() => {
        document.documentElement.classList.remove('no-transition')
        document.querySelector('body').style.pointerEvents = 'all'
      }, 20)
    }
  }

  const linearDistance = (x1, y1, x2, y2) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  const calculateClipPathSize = (origin) => {
    const width = window.innerWidth
    const height = window.innerHeight

    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ]
    const distances = corners.map((c) => linearDistance(origin.x, origin.y, c.x, c.y))
    return Math.max(...distances)
  }

  const createCleanClone = (element) => {
    const clone = element.cloneNode(false)

    const vueAttributes = [
      'data-v-',
      'v-',
      '__vue',
      '__vueParentComponent',
      '__vueReactivity',
      '_vei',
      '_value',
      '_assign',
      'data-reactroot'
    ]

    if (clone.attributes) {
      Array.from(clone.attributes).forEach((attr) => {
        if (vueAttributes.some((vueAttr) => attr.name.includes(vueAttr))) {
          clone.removeAttribute(attr.name)
        }
      })
    }

    const processChildren = (original, cloned) => {
      for (let i = 0; i < original.children.length; i++) {
        const originalChild = original.children[i]

        if (
          originalChild.tagName === 'SCRIPT' ||
          originalChild.hasAttribute('data-v-inspector') ||
          originalChild.classList?.contains('vue-portal-target') ||
          originalChild.id === '__vue-devtools-container__' ||
          originalChild.id === 'vue-devtools-container'
        ) {
          continue
        }

        const childClone = originalChild.cloneNode(false)

        if (childClone.attributes) {
          Array.from(childClone.attributes).forEach((attr) => {
            if (vueAttributes.some((vueAttr) => attr.name.includes(vueAttr))) {
              childClone.removeAttribute(attr.name)
            }
          })
        }

        if (originalChild.nodeType === Node.TEXT_NODE) {
          childClone.textContent = originalChild.textContent
        }

        if (originalChild.children.length > 0) {
          processChildren(originalChild, childClone)
        } else if (
          originalChild.nodeType === Node.TEXT_NODE ||
          (originalChild.nodeType === Node.ELEMENT_NODE && originalChild.textContent)
        ) {
          childClone.textContent = originalChild.textContent
        }

        cloned.appendChild(childClone)
      }
    }

    processChildren(element, clone)
    return clone
  }

  const animateThemeTransition = async (newThemeClass, origin) => {
    isAnimating.value = true
    let clonedBody = null

    try {
      const body = document.querySelector('body')
      document.documentElement.classList.add('no-transition')
      body.style.pointerEvents = 'none'

      const scrollableElements = body.querySelectorAll('.scrollable')
      const scrollOffsets = Array.from(scrollableElements).map((el) => el.scrollTop)

      clonedBody = createCleanClone(body)
      clonedBody.className = 'theme-transition-clone'

      Object.assign(clonedBody.style, {
        backfaceVisibility: 'hidden',
        clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
        height: '100%',
        left: '0',
        perspective: '1000px',
        pointerEvents: 'none',
        position: 'fixed',
        top: '0',
        touchAction: 'none',
        userSelect: 'none',
        width: '100%',
        willChange: 'clip-path',
        zIndex: '8000'
      })

      clonedBody.classList.add(newThemeClass)
      document.body.appendChild(clonedBody)

      const clonedScrollableElements = clonedBody.querySelectorAll('.scrollable')
      clonedScrollableElements.forEach((el, index) => {
        if (scrollOffsets[index] !== undefined) {
          el.scrollTop = scrollOffsets[index]
        }
      })

      await nextTick()

      const animation = clonedBody.animate(
        [
          { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
          { clipPath: `circle(${calculateClipPathSize(origin)}px at ${origin.x}px ${origin.y}px)` }
        ],
        {
          composite: 'replace',
          duration: 1500,
          easing: 'cubic-bezier(0.52, 0, 0.28, 0.93)',
          fill: 'forwards'
        }
      )

      await animation.finished

      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newThemeClass)

      if (clonedBody && clonedBody.parentNode) {
        document.body.removeChild(clonedBody)
      }

      setTimeout(() => {
        document.documentElement.classList.remove('no-transition')
        body.style.pointerEvents = 'all'
      }, 20)
    } catch (error) {
      console.error('Theme transition error:', error)

      if (clonedBody && clonedBody.parentNode) {
        try {
          document.body.removeChild(clonedBody)
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError)
        }
      }

      document.documentElement.classList.remove('no-transition')
      document.querySelector('body').style.pointerEvents = 'all'
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newThemeClass)
    } finally {
      isAnimating.value = false
    }
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemChange = (event) => {
    systemPrefersDark.value = event.matches
  }

  onMounted(() => {
    mediaQuery.addEventListener('change', handleSystemChange)
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleSystemChange)
  })

  return {
    isAnimating,
    setTheme,
    theme,
    themeClass
  }
}
