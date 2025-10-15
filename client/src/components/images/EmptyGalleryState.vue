<script setup>
import Icon from "#src/components/common/Icon.vue"
import { gsap } from "gsap"
import { onMounted } from "vue"

const positionIcons = () => {
  const icons = document.querySelectorAll(".floating-icon")
  if (!icons.length) return

  const radius = 75
  const angleStep = (Math.PI * 2) / icons.length
  const startAngle = (-Math.PI / 2) * (gsap.utils.random(-10, 10) / 100)

  icons.forEach((icon, index) => {
    const angle = startAngle + angleStep * index
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius

    gsap.set(icon, { x, y })
  })
}

const animateFloatingIcons = () => {
  const icons = document.querySelectorAll(".floating-icon")
  if (!icons.length) return

  positionIcons()

  gsap.fromTo(
    [".main-icon", ".empty-title", ".empty-description"],
    { opacity: 0, y: -6 },
    { duration: 0.5, ease: "power2.out", opacity: 1, stagger: 0.1, y: 0 }
  )

  icons.forEach((icon, index) => {
    const randomX = gsap.utils.random(-12, 12)
    const randomY = gsap.utils.random(-12, 12)
    const randomRotation = gsap.utils.random(-8, 8)
    const randomOpacity = gsap.utils.random(0.25, 0.5)
    const randomDuration = gsap.utils.random(3, 4.5)
    const randomDelay = index * 0.4

    gsap.fromTo(
      icon,
      { scale: 0.8 },
      { duration: 1, ease: "power2.out", opacity: randomOpacity, scale: 1 }
    )

    gsap.to(icon, {
      delay: randomDelay,
      duration: randomDuration,
      ease: "sine.iOnut",
      opacity: `=${gsap.utils.random(-0.1, 0.15)}`,
      repeat: -1,
      rotation: randomRotation,
      x: `+=${randomX}`,
      y: `+=${randomY}`,
      yoyo: true
    })
  })
}

onMounted(animateFloatingIcons)
</script>

<template>
  <div class="no-images">
    <div class="empty-state">
      <div class="empty-icon-grid">
        <Icon name="Sparkles" :size="20" :stroke-width="1.5" class="floating-icon" />
        <Icon name="Camera" :size="32" :stroke-width="1.5" class="floating-icon" />
        <Icon name="Ghost" :size="56" :stroke-width="1.5" class="main-icon" />
        <Icon name="Telescope" :size="24" :stroke-width="1.5" class="floating-icon" />
        <Icon name="Cloud" :size="24" :stroke-width="1.5" class="floating-icon" />
        <Icon name="LibraryBig" :size="36" :stroke-width="1.5" class="floating-icon" />
      </div>
      <h2 class="empty-title">Hmm, nothing here...</h2>
      <p class="empty-description">Try being more specific or using different keywords</p>
    </div>
  </div>
</template>

<style lang="scss">
.no-images {
  @include flex-center;
  @include fill-parent;
  padding: var(--spacing-8);

  .empty-state {
    @include flex-center(column);
    gap: var(--spacing-3);
    max-width: 400px;
    text-align: center;
  }

  .empty-icon-grid {
    @include flex-center;
    position: relative;
    width: 150px;
    height: 150px;
    margin-bottom: var(--spacing-4);

    .main-icon {
      color: var(--muted-foreground);
      opacity: 0;
    }

    .floating-icon {
      position: absolute;
      color: var(--muted-foreground);
      opacity: 0;
    }
  }

  .empty-title {
    @include text("2xl");
    color: var(--foreground);
  }

  .empty-description {
    @include text("base");
    color: var(--muted-foreground);
  }
}
</style>
