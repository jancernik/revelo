import CollectionsLayout from "#src/layouts/Collections.vue"
import DashboardLayout from "#src/layouts/Dashboard.vue"
import ImagesLayout from "#src/layouts/Images.vue"
import { useAuthStore } from "#src/stores/auth"
import Collection from "#src/views/dashboard/collections/Collection.vue"
import Collections from "#src/views/dashboard/collections/Collections.vue"
import CreateOrEditCollection from "#src/views/dashboard/collections/CreateOrEditCollection.vue"
import SelectCollectionImages from "#src/views/dashboard/collections/SelectCollectionImages.vue"
import EditImages from "#src/views/dashboard/images/EditImages.vue"
import Image from "#src/views/dashboard/images/Image.vue"
import Images from "#src/views/dashboard/images/Images.vue"
import UploadImages from "#src/views/dashboard/images/UploadImages.vue"
import DashboardIndex from "#src/views/dashboard/Index.vue"
import DashboardSettings from "#src/views/dashboard/Settings.vue"
import DashboardTasks from "#src/views/dashboard/Tasks.vue"
import DevIndex from "#src/views/dev/Index.vue"
import Home from "#src/views/Home.vue"
import ImageDisplay from "#src/views/Image.vue"
import Login from "#src/views/Login.vue"
import NotFound from "#src/views/NotFound.vue"
import Signup from "#src/views/Signup.vue"
import VerificationPending from "#src/views/VerificationPending.vue"
import VerifyEmail from "#src/views/VerifyEmail.vue"
import { createRouter, createWebHistory } from "vue-router"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { component: Home, name: "home", path: "/" },
    { component: Login, name: "login", path: "/login" },
    { component: Signup, name: "signup", path: "/signup" },
    { component: VerificationPending, name: "verification-pending", path: "/verification-pending" },
    { component: VerifyEmail, name: "verify-email", path: "/verify-email" },
    {
      children: [
        { component: DashboardIndex, name: "dashboard", path: "" },
        { component: UploadImages, name: "upload", path: "upload" },
        { component: DashboardSettings, name: "settings", path: "settings" },
        { component: DashboardTasks, name: "tasks", path: "tasks" },
        {
          children: [
            {
              component: Collections,
              name: "collections-list",
              path: ""
            },
            {
              component: CreateOrEditCollection,
              name: "collection-new",
              path: "new"
            },
            {
              component: CreateOrEditCollection,
              name: "collection-edit",
              path: ":id/edit",
              props: true
            },
            {
              component: Collection,
              name: "collection-view",
              path: ":id",
              props: true
            },
            {
              component: SelectCollectionImages,
              name: "collection-images",
              path: ":id/images",
              props: true
            }
          ],
          component: CollectionsLayout,
          name: "collections",
          path: "collections"
        },
        {
          children: [
            {
              component: Images,
              name: "images-list",
              path: ""
            },
            {
              component: EditImages,
              name: "image-edit",
              path: ":id/edit",
              props: true
            },
            {
              component: Image,
              name: "image-view",
              path: ":id",
              props: true
            },
            {
              component: UploadImages,
              name: "image-upload",
              path: "upload"
            }
          ],
          component: ImagesLayout,
          name: "images",
          path: "images"
        }
      ],
      component: DashboardLayout,
      meta: { requiresAuth: true },
      path: "/dashboard"
    },

    { component: ImageDisplay, name: "public-image-view", path: "/images/:id", props: true },
    { component: DevIndex, name: "dev", path: "/dev" },
    { component: NotFound, path: "/:catchAll(.*)" }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.accessToken) {
    next("/login")
  } else {
    next()
  }
})

export default router
