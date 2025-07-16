<script setup>
import Icon from "#src/components/common/Icon.vue"
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic Icons</h5>
      <div class="example-row">
        <Icon name="Home" />
        <Icon name="User" />
        <Icon name="Settings" />
        <Icon name="Heart" />
        <Icon name="Star" />
      </div>
    </div>

    <div class="example-group">
      <h5>Different Sizes</h5>
      <div class="example-row">
        <Icon name="Globe" :size="16" />
        <Icon name="Globe" :size="24" />
        <Icon name="Globe" :size="32" />
        <Icon name="Globe" :size="48" />
      </div>
    </div>

    <div class="example-group">
      <h5>Custom Colors</h5>
      <div class="example-row">
        <Icon name="Heart" color="#ef4444" />
        <Icon name="Star" color="#f59e0b" />
        <Icon name="CheckCircle" color="#10b981" />
        <Icon name="Info" color="#3b82f6" />
        <Icon name="AlertTriangle" color="#f97316" />
      </div>
    </div>

    <div class="example-group">
      <h5>Different Stroke Widths</h5>
      <div class="example-row">
        <Icon name="Map" :stroke-width="1" />
        <Icon name="Map" :stroke-width="2" />
        <Icon name="Map" :stroke-width="3" />
        <Icon name="Map" :stroke-width="4" />
      </div>
    </div>
  </div>
</template>
