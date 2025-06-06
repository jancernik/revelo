<script setup>
import { onMounted, watch, ref } from 'vue'
import Scrollable from '@/components/common/Scrollable.vue'

const elements = ref(20)

function numberToColor(num) {
  let hash = num + 0x9e3779b9
  hash ^= hash >> 15
  hash *= 0x85ebca6b
  hash ^= hash >> 13
  hash *= 0xc2b2ae35
  hash ^= hash >> 16

  const r = hash & 0xff
  const g = (hash >> 8) & 0xff
  const b = (hash >> 16) & 0xff

  return `rgb(${r}, ${g}, ${b})`
}

const getNItems = (n) => {
  const array = []
  for (let i = 0; i < n; i++) {
      array.push({ id: i + 1, name: `${i + 1}`, color: numberToColor(i + 1) })
  }
  return array
}
</script>

<template>
<div class="testy">
  <div class="other">

  </div>
  <div class="controls">
    <button @click="elements++">+</button>
    <button @click="elements--">-</button>
    <span>{{ elements }}</span>
  </div>
  <Scrollable class="test">


    <div
      v-for="(item, index) in getNItems(elements)"
      :key="index"
      class="item"
      :class="item.class"
      :style="{ background: item.color }"
    >
      {{ item.name }}
    </div>
  </Scrollable>
</div>
</template>

<style lang="scss">
.controls {
  position: fixed;
  top: 50px;
  left: 0;
  z-index: 1000;
  button {
    padding: 1rem
  }
}

.item {
  @include flex-center;
  border-radius: var(--radius-md);
  color: white;
  font-size: 2rem;
  height: 50px;
  width: 100px;
  min-height: 50px;
  min-width: 100px;
  align-self: center;
  justify-self: center;
  // margin-bottom: 1rem;
}
</style>
