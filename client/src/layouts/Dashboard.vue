<script setup>
import Footer from "#src/components/dashboard/Footer.vue"
import Header from "#src/components/dashboard/Header.vue"
import Sidebar from "#src/components/dashboard/Sidebar.vue"
</script>

<template>
  <div class="dashboard-layout">
    <Sidebar />
    <div class="dashboard-main">
      <Header />
      <div class="dashboard-content">
        <RouterView />
      </div>
      <Footer />
    </div>
  </div>
</template>

<style lang="scss">
.dashboard-layout {
  min-height: 100vh;
  background-color: var(--background);
  @include flex(row, flex-start, stretch);

  .dashboard-main {
    flex: 1;
    min-width: 0;
    @include flex(column, stretch, flex-start);

    .dashboard-content {
      flex: 1;
      padding: var(--spacing-6) var(--spacing-8);
      overflow-y: auto;
      @include hide-scrollbar;
    }

    @include breakpoint("md") {
      .dashboard-content {
        padding: var(--spacing-4) var(--spacing-6);
      }
    }
  }

  @media (max-width: 991px) {
    flex-direction: column;

    .dashboard-main {
      margin-left: 0;
    }
  }

  @media (min-width: 992px) {
    .dashboard-main {
      margin-left: 16rem;
    }
  }
}

.dashboard-empty {
  @include flex-center(column);
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  text-align: center;
  color: var(--muted-foreground);

  h5 {
    color: var(--foreground);
    margin: 0;
    line-height: 1;
  }

  p {
    margin: 0;
    max-width: 32rem;
    @include text("sm");
  }
}
</style>
