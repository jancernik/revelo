<script setup></script>

<template>
  <footer id="footer">
    <div class="footer-inner inner">Footer</div>
  </footer>
</template>

<style lang="scss" scoped>
#footer {
  height: $footer-height;
  display: none;
  padding-right: 0 !important;
  @include responsive-spacing;

  .footer-inner {
    @include flex-center;
    background-color: $white;
  }
}
</style>
