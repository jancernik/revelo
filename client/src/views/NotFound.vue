<script setup>
import Button from "#src/components/common/Button.vue"
import { useRouter } from "vue-router"

const router = useRouter()

const goHome = () => {
  router.push("/")
}

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="not-found">
    <div class="content">
      <div class="error-code">404</div>
      <div class="message">
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
      </div>
      <div class="actions">
        <Button color="primary" icon="Home" @click="goHome">Go Home</Button>
        <Button color="secondary" icon="ArrowLeft" @click="goBack">Go Back</Button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.not-found {
  @include flex-center;
  @include fill-parent;

  > .content {
    @include flex(column, center, center);
    gap: var(--spacing-6);
    max-width: 400px;
    padding: var(--spacing-8);
    width: 100%;
  }

  .error-code {
    font-weight: var(--font-bold);
    color: var(--muted-foreground);
    font-size: clamp(4rem, 8vw, 5rem);
    line-height: 1;
  }

  .message {
    @include flex(column, center, center);
    gap: var(--spacing-4);

    h1 {
      margin: 0;
      color: var(--foreground);
    }

    p {
      margin: 0;
      color: var(--muted-foreground);
      max-width: 24rem;
      line-height: 1.6;
    }
  }

  .actions {
    @include flex(column, center, center);
    gap: var(--spacing-3);
    width: 100%;

    .button {
      width: 100%;
    }
  }
}
</style>
