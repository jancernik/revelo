<script setup>
import { ref } from 'vue'
import RSwitch from '@/components/common/Switch.vue'

const viewMode = ref('grid')
const theme = ref('light')
const alignment = ref('left')
const verticalTheme = ref('auto')
const disabledValue = ref('enabled')

const viewOptions = [
  { value: 'list', icon: 'List' },
  { value: 'grid', icon: 'Grid3X3' },
  { value: 'card', icon: 'LayoutGrid' }
]

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' }
]

const alignmentOptions = [
  { value: 'left', icon: 'AlignLeft' },
  { value: 'center', icon: 'AlignCenter' },
  { value: 'right', icon: 'AlignRight' },
  { value: 'justify', icon: 'AlignJustify' }
]

const verticalOptions = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
  { value: 'auto', label: 'System' }
]

const disabledOptions = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' }
]

const mixedOptions = [
  { value: 'create', icon: 'Plus', label: 'Create' },
  { value: 'edit', icon: 'Edit', label: 'Edit' },
  { value: 'delete', icon: 'Trash2', label: 'Delete' }
]

const mixedValue = ref('create')
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Text Labels</h5>
      <div class="example-column">
        <RSwitch v-model="theme" :options="themeOptions" />
      </div>
    </div>

    <div class="example-group">
      <h5>Icon Only</h5>
      <div class="example-column">
        <RSwitch v-model="viewMode" :options="viewOptions" />
      </div>
    </div>

    <div class="example-group">
      <h5>Text and Icons</h5>
      <div class="example-column">
        <RSwitch v-model="mixedValue" :options="mixedOptions" />
      </div>
    </div>

    <div class="example-group">
      <h5>Alignment Tools</h5>
      <div class="example-column">
        <RSwitch v-model="alignment" :options="alignmentOptions" vertical />
      </div>
    </div>

    <div class="example-group">
      <h5>Vertical Layout</h5>
      <div class="example-column">
        <RSwitch v-model="verticalTheme" :options="verticalOptions" vertical />
      </div>
    </div>

    <div class="example-group">
      <h5>Disabled State</h5>
      <div class="example-column">
        <RSwitch v-model="disabledValue" :options="disabledOptions" disabled />
      </div>
    </div>
  </div>
</template>
