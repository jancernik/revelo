<script setup>
import Icon from "#src/components/common/Icon.vue"
import { useAuthStore } from "#src/stores/auth"
import { reactive } from "vue"
import { useRoute, useRouter } from "vue-router"

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const sidebar = reactive({
  bottom: [
    {
      icon: "CheckSquare",
      key: "tasks",
      label: "Tasks",
      path: "/dashboard/tasks"
    },
    {
      icon: "Settings",
      key: "settings",
      label: "Settings",
      path: "/dashboard/settings"
    },
    {
      action: () => {
        authStore.logout().then(() => {
          router.push("/login")
        })
      },
      className: "logout",
      icon: "LogOut",
      key: "logout",
      label: "Logout"
    }
  ],
  top: [
    {
      icon: "LayoutDashboard",
      key: "dashboard",
      label: "Dashboard",
      path: "/dashboard"
    },
    {
      icon: "Image",
      key: "images",
      label: "Images",
      path: "/dashboard/images"
    },
    {
      icon: "FolderOpen",
      key: "collections",
      label: "Collections",
      path: "/dashboard/collections"
    }
  ]
})

const handleItemClick = (item) => {
  if (item.action) {
    item.action()
  } else if (item.path) {
    router.push(item.path)
  }
}

const isActive = (path) => {
  if (!path) return false
  if (path === "/dashboard") {
    return route?.path === path
  }
  return route?.path.startsWith(path)
}
</script>

<template>
  <aside class="dashboard-sidebar">
    <div class="sidebar-content">
      <ul class="top">
        <li v-for="item in sidebar.top" :key="item.key" :class="{ active: isActive(item.path) }">
          <button @click="handleItemClick(item)">
            <Icon :name="item.icon" size="16" />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>

      <ul class="bottom">
        <li v-for="item in sidebar.bottom" :key="item.key">
          <button :class="item.className" @click="handleItemClick(item)">
            <Icon :name="item.icon" size="16" />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style lang="scss">
.dashboard-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 16rem;
  background: var(--background);
  border-right: 1px solid var(--border);
  z-index: z(menu);

  .sidebar-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100vh;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .top {
    padding: var(--spacing-6) var(--spacing-4) var(--spacing-4);
  }

  .bottom {
    padding: var(--spacing-4);
    border-top: 1px solid var(--border);
    margin-top: var(--spacing-4);
  }

  li.active {
    background: var(--secondary);
    border-radius: var(--radius-md);
  }

  button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    color: var(--muted-foreground);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    gap: var(--spacing-2);
    @include text("sm");
    font-weight: var(--font-medium);
    transition: all 0.15s ease;

    .icon {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    &:hover {
      color: var(--foreground);
      background: var(--secondary-hover);

      .icon {
        opacity: 1;
      }
    }

    &.logout:hover {
      color: var(--danger);
      background: var(--danger-background);
    }
  }

  li.active button {
    color: var(--foreground);
    font-weight: var(--font-semibold);

    .icon {
      opacity: 1;
    }
  }

  @media (max-width: 991px) {
    position: relative;
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);

    .sidebar-content {
      flex-direction: row;
      align-items: center;
      height: auto;
    }

    .top {
      flex: 1;
      flex-direction: row;
      padding: var(--spacing-4);
    }

    .bottom {
      flex-direction: row;
      padding: var(--spacing-4) var(--spacing-4) var(--spacing-4) 0;
      gap: var(--spacing-2);
    }

    .bottom {
      border-top: none;
      border-left: 1px solid var(--border);
      margin-top: 0;
      margin-left: var(--spacing-2);
    }

    button span {
      @media (max-width: 640px) {
        display: none;
      }
    }
  }
}
</style>
