<script setup>
defineProps({
  components: {
    type: Array,
    required: true
  },
  activeSection: {
    type: String,
    default: ''
  }
})

defineEmits(['navigate'])
</script>

<template>
  <aside class="dev-sidebar">
    <ul>
      <li
        v-for="component in components"
        :key="component.id"
        :class="{ active: activeSection === component.id }"
      >
        <div class="list-item">
          <button @click="$emit('navigate', component.id)">
            {{ component.name }}
          </button>
        </div>
      </li>
    </ul>
  </aside>
</template>

<style lang="scss" scoped>
.dev-sidebar {
  @include flex-center;
  height: 100%;
  padding: 1rem;
}

ul {
  list-style: none;
}
li {
  border-radius: var(--radius-sm);

  &.active {
    background-color: var(--primary);
    color: var(--primary-foreground);
    font-weight: var(--font-medium);
  }
}

button {
  @include text('base');
  font-weight: var(--font-medium);
  width: 100%;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
}
</style>
