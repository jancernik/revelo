<script setup>
import { ref } from 'vue'

import Input from '@/components/common/Input.vue'

const basicValue = ref('')
const emailValue = ref('')
const passwordValue = ref('')
const priceValue = ref('')
const searchValue = ref('')
const errorValue = ref('')
</script>

<template>
  <div class="examples-grid">
    <div class="example-group">
      <h5>Basic Input</h5>
      <div class="example-column">
        <Input
          v-model="basicValue"
          label="Full Name"
          placeholder="Enter your full name"
          description="This will be displayed on your profile"
        />
      </div>
    </div>

    <div class="example-group">
      <h5>Input Types</h5>
      <div class="example-column">
        <Input
          v-model="emailValue"
          type="email"
          label="Email Address"
          placeholder="john@example.com"
          icon="Mail"
        />
        <Input
          v-model="passwordValue"
          type="password"
          label="Password"
          placeholder="Enter your password"
          icon="Lock"
        />
      </div>
    </div>

    <div class="example-group">
      <h5>With Icons</h5>
      <div class="example-column">
        <Input v-model="searchValue" placeholder="Search..." icon="Search" icon-position="left" />
        <Input v-model="searchValue" placeholder="Search..." icon="Search" icon-position="right" />
      </div>
    </div>

    <div class="example-group">
      <h5>With Units</h5>
      <div class="example-column">
        <Input
          v-model="priceValue"
          label="Price"
          placeholder="0.00"
          unit="USD"
          unit-position="right"
        />
        <Input v-model="priceValue" label="Weight" placeholder="0" unit="kg" unit-position="left" />
      </div>
    </div>

    <div class="example-group">
      <h5>States</h5>
      <div class="example-column">
        <Input
          v-model="errorValue"
          label="Email"
          placeholder="Enter email"
          error="Please enter a valid email address"
        />
        <Input label="Disabled Input" placeholder="This input is disabled" disabled />
      </div>
    </div>
  </div>
</template>
