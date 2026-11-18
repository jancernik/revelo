import { gsap } from "gsap"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"

import type { GalleryHandle } from "#src/components/images/types"

import { useAdaptiveFrameRate } from "#src/composables/useAdaptiveFrameRate"

export interface ThemeOrigin {
  x: number
  y: number
}

export interface ThemeTransitionOptions {
  animate?: boolean
  origin?: ThemeOrigin
}

const theme = ref(localStorage.getItem("theme") || "system")
const systemPrefersDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches)
const isAnimating = ref(false)
const isWaitingForGallery = ref(false)
let imageGallery: GalleryHandle | null | undefined = null

export function useTheme() {
  const frameRateAdapter = useAdaptiveFrameRate()

  const themeClass = computed(() => {
    if (theme.value !== "system") {
      return theme.value
    }

    return systemPrefersDark.value ? "dark" : "light"
  })

  const registerImageGallery = (ref: GalleryHandle | null | undefined) => {
    imageGallery = ref
  }

  const waitForGalleryToSettle = async () => {
    if (!imageGallery) return

    isWaitingForGallery.value = true
    const gallery = imageGallery

    return new Promise<void>((resolve) => {
      gallery.onSettle(() => {
        isWaitingForGallery.value = false
        resolve()
      })
    })
  }

  const setTheme = async (newTheme: string, opts?: ThemeTransitionOptions) => {
    if (isAnimating.value) return

    const options = {
      animate: true,
      origin: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      ...opts
    }
    const oldTheme = themeClass.value
    const newThemeClass =
      newTheme !== "system" ? newTheme : systemPrefersDark.value ? "dark" : "light"

    if (oldTheme === newThemeClass) {
      theme.value = newTheme
      localStorage.setItem("theme", newTheme)
      return
    }

    const wasAutoScrolling = imageGallery?.isAutoScrollActive?.() ?? false

    if (imageGallery && !imageGallery.isScrollPaused()) {
      imageGallery.stopAutoScroll()
      if (!wasAutoScrolling) {
        imageGallery.pauseScrolling()
        await waitForGalleryToSettle()
      }
    }

    if (options.animate) {
      await animateThemeTransition(newThemeClass, options.origin)
      theme.value = newTheme
      localStorage.setItem("theme", newTheme)
    } else {
      document.documentElement.classList.add("no-transition")
      document.body.style.pointerEvents = "none"
      await nextTick()
      theme.value = newTheme
      localStorage.setItem("theme", newTheme)
      setTimeout(() => {
        document.documentElement.classList.remove("no-transition")
        document.body.style.pointerEvents = "all"
      }, 20)
    }

    if (imageGallery) {
      if (wasAutoScrolling) {
        imageGallery.startAutoScroll()
      } else if (imageGallery.isScrollPaused()) {
        imageGallery.resumeScrolling()
      }
      imageGallery.queueAutoScrollResume?.()
    }
  }

  const linearDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  const calculateMaskSize = (origin: ThemeOrigin) => {
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

  const createCleanClone = (element: HTMLElement) => {
    const clone = element.cloneNode(false)
    if (!(clone instanceof HTMLElement)) throw new TypeError("Expected an HTML element clone")

    const vueAttributes = [
      "data-v-",
      "v-",
      "__vue",
      "__vueParentComponent",
      "__vueReactivity",
      "_vei",
      "_value",
      "_assign",
      "data-reactroot"
    ]

    if (clone.attributes) {
      Array.from(clone.attributes).forEach((attr) => {
        if (vueAttributes.some((vueAttr) => attr.name.includes(vueAttr))) {
          clone.removeAttribute(attr.name)
        }
      })
    }

    const processChildren = (original: Element, cloned: Element) => {
      for (let i = 0; i < original.children.length; i++) {
        const originalChild = original.children[i]

        if (
          originalChild.tagName === "SCRIPT" ||
          originalChild.hasAttribute("data-v-inspector") ||
          originalChild.classList?.contains("vue-portal-target") ||
          originalChild.id === "__vue-devtools-container__" ||
          originalChild.id === "vue-devtools-container"
        ) {
          continue
        }

        const childClone = originalChild.cloneNode(false)
        if (!(childClone instanceof Element)) throw new TypeError("Expected an element clone")

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

  const animateThemeTransition = async (newThemeClass: string, origin: ThemeOrigin) => {
    isAnimating.value = true
    let clonedBody: HTMLElement | null = null
    let tween: gsap.core.Tween | null = null
    let resizeHandler: (() => void) | null = null

    const cleanup = () => {
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler)
        resizeHandler = null
      }
    }

    const completeTransition = () => {
      cleanup()

      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(newThemeClass)

      if (clonedBody && clonedBody.parentNode) {
        document.body.removeChild(clonedBody)
      }

      const body = document.body
      setTimeout(() => {
        document.documentElement.classList.remove("no-transition")
        body.style.pointerEvents = "all"
      }, 20)
    }

    try {
      const body = document.body
      document.documentElement.classList.add("no-transition")
      body.style.pointerEvents = "none"

      const scrollableElements = body.querySelectorAll(".scrollable")
      const scrollOffsets = Array.from(scrollableElements).map((el) => el.scrollTop)

      clonedBody = createCleanClone(body)
      const transitionClone = clonedBody
      clonedBody.className = "theme-transition-clone"

      const finalRadius = calculateMaskSize(origin)

      Object.assign(clonedBody.style, {
        backfaceVisibility: "hidden",
        height: "100%",
        left: "0",
        mask: `radial-gradient(circle at ${origin.x}px ${origin.y}px, black 0px, black 0px, transparent 0px)`,
        perspective: "1000px",
        pointerEvents: "none",
        position: "fixed",
        top: "0",
        touchAction: "none",
        userSelect: "none",
        WebkitMask: `radial-gradient(circle at ${origin.x}px ${origin.y}px, black 0px, black 0px, transparent 0px)`,
        width: "100%",
        willChange: "mask, -webkit-mask",
        zIndex: "8000"
      })

      clonedBody.classList.add(newThemeClass)
      document.body.appendChild(clonedBody)

      const clonedScrollableElements = clonedBody.querySelectorAll(".scrollable")
      clonedScrollableElements.forEach((el, index) => {
        if (scrollOffsets[index] !== undefined) {
          el.scrollTop = scrollOffsets[index]
        }
      })

      await nextTick()

      const animationState = { radius: 0 }

      return new Promise<void>((resolve) => {
        resizeHandler = () => {
          if (tween) {
            tween.kill()
          }
          completeTransition()
          resolve()
        }
        window.addEventListener("resize", resizeHandler)

        tween = gsap.to(animationState, {
          duration: 1.5,
          ease: "power2.inOut",
          onComplete: function () {
            completeTransition()
            resolve()
          },
          onUpdate: function () {
            const maskValue = `radial-gradient(circle at ${origin.x}px ${origin.y}px, black ${
              animationState.radius
            }px, black ${animationState.radius}px, transparent ${animationState.radius + 1}px)`
            transitionClone.style.mask = maskValue
            Object.assign(transitionClone.style, { WebkitMask: maskValue })
          },
          radius: finalRadius
        })
      })
    } catch (error) {
      console.error("Theme transition error:", error)

      cleanup()

      if (clonedBody && clonedBody.parentNode) {
        try {
          document.body.removeChild(clonedBody)
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError)
        }
      }

      document.documentElement.classList.remove("no-transition")
      document.body.style.pointerEvents = "all"
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(newThemeClass)
    } finally {
      isAnimating.value = false
    }
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handleSystemChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches
  }

  onMounted(() => {
    mediaQuery.addEventListener("change", handleSystemChange)

    frameRateAdapter.init()
  })

  onUnmounted(() => {
    mediaQuery.removeEventListener("change", handleSystemChange)
  })

  return {
    isAnimating,
    isWaitingForGallery,
    registerImageGallery,
    setTheme,
    theme,
    themeClass
  }
}
