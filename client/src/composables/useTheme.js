import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

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
      await nextTick()
      theme.value = newTheme
      localStorage.setItem('theme', newTheme)
      setTimeout(() => {
        document.documentElement.classList.remove('no-transition')
      }, 50)
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

  const animateThemeTransition = async (newThemeClass, origin) => {
    isAnimating.value = true

    try {
      const body = document.querySelector('body')
      document.documentElement.classList.add('no-transition')

      const clonedBody = body.cloneNode(true)
      clonedBody.className = 'theme-transition-clone'

      const scrollableElements = body.querySelectorAll('.scrollable')
      const scrollOffsets = Array.from(scrollableElements).map((el) => el.scrollTop)
      console.log('scrollOffsets: ', scrollOffsets)

      Object.assign(clonedBody.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '8000',
        pointerEvents: 'none',
        clipPath: 'circle(0px at ' + origin.x + 'px ' + origin.y + 'px)'
      })

      clonedBody.classList.add(newThemeClass)
      document.body.appendChild(clonedBody)

      const clonedScrollableElements = clonedBody.querySelectorAll('.scrollable')
      clonedScrollableElements.forEach((el, index) => {
        el.scrollTop = scrollOffsets[index] || 0
      })

      await nextTick()

      const animation = clonedBody.animate(
        [
          { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
          { clipPath: `circle(${calculateClipPathSize(origin)}px at ${origin.x}px ${origin.y}px)` }
        ],
        {
          duration: 1500,
          easing: 'cubic-bezier(0.52,0,0.28,0.93)',
          fill: 'forwards'
        }
      )

      await animation.finished

      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newThemeClass)

      document.body.removeChild(clonedBody)

      setTimeout(() => {
        document.documentElement.classList.remove('no-transition')
      }, 50)
    } catch (error) {
      document.documentElement.classList.remove('no-transition')
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
    theme,
    themeClass,
    setTheme,
    isAnimating
  }
}
