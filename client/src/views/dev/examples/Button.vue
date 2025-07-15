<script setup>
import Button from "@/components/common/Button.vue"
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic Buttons</h5>
      <div class="example-row">
        <Button>Primary Button</Button>
        <Button color="secondary">Secondary Button</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>With Icons</h5>
      <div class="example-row">
        <Button icon="Plus">Add Item</Button>
        <Button icon="Download" color="secondary">Download</Button>
      </div>
    </div>

    <div class="example-group">
      <h5>Icon Only</h5>
      <div class="example-row">
        <Button icon="Settings" />
        <Button icon="Heart" color="secondary" />
      </div>
    </div>

    <div class="example-group">
      <h5>States</h5>
      <div class="example-row">
        <Button disabled>Disabled</Button>
        <Button color="secondary" disabled>Disabled Secondary</Button>
      </div>
    </div>
  </div>
</template>
