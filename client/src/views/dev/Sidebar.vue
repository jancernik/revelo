<script setup>
defineProps({
  activeSection: {
    default: '',
    type: String
  },
  components: {
    required: true,
    type: Array
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

<style lang="scss">
.dev-sidebar {
  @include flex-center;
  height: 100%;
  padding: var(--spacing-4);

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
    padding: var(--spacing-2) var(--spacing-4);
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
  }
}
</style>
