import { useAuthStore } from "#src/stores/auth"
import DashboardIndex from "#src/views/dashboard/Index.vue"
import DashboardSettings from "#src/views/dashboard/Settings.vue"
import DashboardUpload from "#src/views/dashboard/Upload.vue"
import DevIndex from "#src/views/dev/Index.vue"
import NotFound from "#src/views/errors/NotFound.vue"
import Home from "#src/views/Home.vue"
import Image from "#src/views/Image.vue"
import Login from "#src/views/Login.vue"
import Signup from "#src/views/Signup.vue"
import VerificationPending from "#src/views/VerificationPending.vue"
import VerifyEmail from "#src/views/VerifyEmail.vue"
import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      component: Home,
      name: "home",
      path: "/"
    },
    {
      component: Login,
      name: "login",
      path: "/login"
    },
    {
      component: Signup,
      name: "signup",
      path: "/signup"
    },
    {
      component: VerificationPending,
      name: "verification-pending",
      path: "/verification-pending"
    },
    {
      component: VerifyEmail,
      name: "verify-email",
      path: "/verify-email"
    },
    {
      children: [
        {
          component: DashboardIndex,
          name: "dashboard",
          path: ""
        },
        {
          component: DashboardUpload,
          name: "upload",
          path: "upload"
        },
        {
          component: DashboardSettings,
          name: "settings",
          path: "settings"
        }
      ],
      meta: { requiresAuth: true },
      path: "/dashboard"
    },
    {
      component: Image,
      name: "image",
      path: "/image/:id",
      props: true
    },
    {
      component: DevIndex,
      name: "dev",
      path: "/dev"
    },
    {
      component: NotFound,
      path: "/:catchAll(.*)"
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.accessToken) {
    next("/login")
  } else {
    next()
  }
})

export default router
