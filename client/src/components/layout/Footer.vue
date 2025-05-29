<script setup></script>

<template>
  <footer id="footer">
    <div class="footer-inner inner">Footer</div>
  </footer>
</template>

<style lang="scss" scoped>
#footer {
  height: 6rem;
  display: none;
  padding-right: 0 !important;
  padding: calc(var(--spacing-1) / 2);

  > .inner {
    @include fill-parent;
    gap: var(--spacing-1);
    border-radius: 0;
  }

  .footer-inner {
    @include flex-center;
    background-color: var(--background);
  }
}
</style>
