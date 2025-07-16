<script setup>
import RSwitch from "#src/components/common/Switch.vue"
import { ref } from "vue"

const viewMode = ref("grid")
const theme = ref("light")
const alignment = ref("left")
const verticalTheme = ref("auto")
const disabledValue = ref("enabled")

const viewOptions = [
  { icon: "List", value: "list" },
  { icon: "Grid3X3", value: "grid" },
  { icon: "LayoutGrid", value: "card" }
]

const themeOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" }
]

const alignmentOptions = [
  { icon: "AlignLeft", value: "left" },
  { icon: "AlignCenter", value: "center" },
  { icon: "AlignRight", value: "right" },
  { icon: "AlignJustify", value: "justify" }
]

const verticalOptions = [
  { label: "Light Theme", value: "light" },
  { label: "Dark Theme", value: "dark" },
  { label: "System", value: "auto" }
]

const disabledOptions = [
  { label: "Enabled", value: "enabled" },
  { label: "Disabled", value: "disabled" }
]

const mixedOptions = [
  { icon: "Plus", label: "Create", value: "create" },
  { icon: "Edit", label: "Edit", value: "edit" },
  { icon: "Trash2", label: "Delete", value: "delete" }
]

const mixedValue = ref("create")
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
