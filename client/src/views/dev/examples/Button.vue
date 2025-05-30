<script setup>
import RButton from '@/components/common/Button.vue'
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic Buttons</h5>
      <div class="example-row">
        <RButton>Primary Button</RButton>
        <RButton color="secondary">Secondary Button</RButton>
      </div>
    </div>

    <div class="example-group">
      <h5>With Icons</h5>
      <div class="example-row">
        <RButton icon="Plus">Add Item</RButton>
        <RButton icon="Download" color="secondary">Download</RButton>
      </div>
    </div>

    <div class="example-group">
      <h5>Icon Only</h5>
      <div class="example-row">
        <RButton icon="Settings" />
        <RButton icon="Heart" color="secondary" />
      </div>
    </div>

    <div class="example-group">
      <h5>States</h5>
      <div class="example-row">
        <RButton disabled>Disabled</RButton>
        <RButton color="secondary" disabled>Disabled Secondary</RButton>
      </div>
    </div>
  </div>
</template>
