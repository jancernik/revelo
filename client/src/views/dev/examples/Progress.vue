<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Progress from '@/components/common/Progress.vue'

const animatedProgress = ref(0)

let animationInterval = null

const startAnimation = () => {
  animationInterval = setInterval(
    () => {
      if (animatedProgress.value >= 100) {
        animatedProgress.value = 0
        stopAnimation()
        setTimeout(() => {
          startAnimation()
        }, 400)
      } else {
        const increment = Math.floor(Math.random() * 15) + 2
        if (animatedProgress.value + increment > 100) {
          animatedProgress.value = 100
        } else {
          animatedProgress.value += increment
        }
      }
    },
    Math.floor(Math.random() * 101) + 300
  )
}

const stopAnimation = () => {
  if (animationInterval) {
    clearInterval(animationInterval)
    animationInterval = null
  }
}

onMounted(startAnimation)
onUnmounted(stopAnimation)
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Different Values</h5>
      <div class="example-column">
        <div class="progress-item">
          <span class="progress-label">0%</span>
          <Progress value="0" />
        </div>
        <div class="progress-item">
          <span class="progress-label">50%</span>
          <Progress value="50" />
        </div>
        <div class="progress-item">
          <span class="progress-label">100%</span>
          <Progress value="100" />
        </div>
      </div>
    </div>

    <div class="example-group">
      <h5>Animated Progress</h5>
      <div class="example-column">
        <div class="progress-item">
          <span class="progress-label">Animated ({{ Math.round(animatedProgress) }}%)</span>
          <Progress :value="animatedProgress" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.progress-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary);
}
</style>
