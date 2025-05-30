<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from '@/views/dev/Sidebar.vue'

const route = useRoute()
const router = useRouter()

const components = ref([])
const activeSection = ref('')
const observer = ref(null)

const loadComponents = async () => {
  try {
    const modules = import.meta.glob('@/views/dev/examples/*.vue', { eager: true })
    const componentList = []

    for (const path in modules) {
      const filename = path.split('/').pop().replace('.vue', '')
      const component = modules[path].default

      componentList.push({
        name: filename,
        id: filename.toLowerCase(),
        component: component
      })
    }

    components.value = componentList.sort((a, b) => a.name.localeCompare(b.name))

    await nextTick()
    setupIntersectionObserver()

    if (route.hash) {
      scrollToSection(route.hash.substring(1))
    }
  } catch (error) {
    console.error('Error loading components:', error)
  }
}

const setupIntersectionObserver = () => {
  const options = {
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  }

  observer.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id
        activeSection.value = id

        const newHash = `#${id}`
        if (route.hash !== newHash) {
          router.replace({ ...route, hash: newHash })
        }
      }
    })
  }, options)

  components.value.forEach((comp) => {
    const element = document.getElementById(comp.id)
    if (element) {
      observer.value.observe(element)
    }
  })
}

const scrollToSection = (id) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

const navigateToSection = (id) => {
  scrollToSection(id)
  router.push({ ...route, hash: `#${id}` })
}

onMounted(() => {
  loadComponents()
})

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})
</script>

<template>
  <div class="dev">
    <Sidebar
      :components="components"
      :active-section="activeSection"
      @navigate="navigateToSection"
    />

    <div class="components">
      <section v-for="component in components" :id="component.id" :key="component.id">
        <h3>{{ component.name }}</h3>
        <div class="example">
          <component :is="component.component" />
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dev {
  @include fill-parent;
  @include flex-center;
}

.components {
  @include fill-parent;
  @include flex(column, center);
  @include hide-scrollbar;
  overflow-y: auto;
  width: 100%;
}

section {
  padding: var(--spacing-6);
  width: 100%;
  max-width: 800px;

  h3 {
    margin-bottom: 1rem;
  }

  .example {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
  }
}
</style>

<style lang="scss">
.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  .example-group {
    @include flex(column);
    gap: 0.5rem;
  }
}

.example-row {
  @include flex(row, center);
  flex-wrap: wrap;
  gap: 1rem;
}

.example-column {
  @include flex(column, center);
  gap: 1rem;
  width: 100%;
}
</style>
