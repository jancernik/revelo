<script setup>
import ImageGallery from '@/components/ImageGallery.vue'
import Scrollable from '@/components/common/Scrollable.vue'
import { useTemplateRef } from 'vue'

const scrollable = useTemplateRef('scrollable')
</script>

<template>
  <Scrollable ref="scrollable">
    <ImageGallery :scrollable="scrollable" />
  </Scrollable>
</template>

<style lang="scss"></style>
