<script setup>
import Toggle from "#src/components/common/Toggle.vue"
import { ref } from "vue"

const basicToggle = ref(true)
const labeledToggle = ref(true)
const disabledToggle = ref(false)
const disabledActiveToggle = ref(true)
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic</h5>
      <div class="example-column">
        <Toggle v-model="basicToggle" />
        <Toggle v-model="labeledToggle" label="With label" />
      </div>
    </div>

    <div class="example-group">
      <h5>Disabled</h5>
      <div class="example-column">
        <Toggle v-model="disabledToggle" label="Disabled (Off)" disabled />
        <Toggle v-model="disabledActiveToggle" label="Disabled (On)" disabled />
      </div>
    </div>
  </div>
</template>
