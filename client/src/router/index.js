import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Signup from '@/views/Signup.vue'
import DashboardIndex from '@/views/dashboard/Index.vue'
import DashboardUpload from '@/views/dashboard/Upload.vue'
import NotFound from '@/views/errors/NotFound.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/signup',
      name: 'signup',
      component: Signup
    },
    {
      path: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardIndex
        },
        {
          path: 'upload',
          name: 'upload',
          component: DashboardUpload
        }
      ]
    },
    {
      path: '/:catchAll(.*)',
      component: NotFound
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.accessToken) {
    next('/login')
  } else {
    next()
  }
})

export default router
