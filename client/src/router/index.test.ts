import type { Router } from "vue-router"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted((): { accessToken: null | string | undefined } => ({ accessToken: null }))
vi.mock("#src/stores/auth", () => ({ useAuthStore: () => auth }))
let router: null | Router = null
const setup = async (production = false) => {
  vi.stubEnv("PROD", production)
  router = (await import("#src/router")).default
  return router
}
beforeEach(() => {
  vi.resetModules()
  auth.accessToken = null
  window.history.replaceState({}, "", "/")
})
afterEach(() => {
  router?.options.history.destroy()
  router = null
  vi.unstubAllEnvs()
})

const namedRoutes = [
  ["home", "/", {}],
  ["public-image-view", "/images/photo", { id: "photo" }],
  ["login", "/login", {}],
  ["signup", "/signup", {}],
  ["verification-pending", "/verification-pending", {}],
  ["verify-email", "/verify-email", {}],
  ["dashboard", "/dashboard", {}],
  ["upload", "/dashboard/upload", {}],
  ["settings", "/dashboard/settings", {}],
  ["tasks", "/dashboard/tasks", {}],
  ["collections", "/dashboard/collections", {}],
  ["collections-list", "/dashboard/collections", {}],
  ["collection-new", "/dashboard/collections/new", {}],
  ["collection-edit", "/dashboard/collections/album/edit", { id: "album" }],
  ["collection-view", "/dashboard/collections/album", { id: "album" }],
  ["collection-images", "/dashboard/collections/album/images", { id: "album" }],
  ["images", "/dashboard/images", {}],
  ["images-list", "/dashboard/images", {}],
  ["images-edit", "/dashboard/images/edit", {}],
  ["image-edit", "/dashboard/images/photo/edit", { id: "photo" }],
  ["image-view", "/dashboard/images/photo", { id: "photo" }],
  ["image-upload", "/dashboard/images/upload", {}],
  ["dev", "/dev", {}]
] as const

describe("router", () => {
  it.each(namedRoutes)("resolves %s to %s", async (name, path, params) => {
    const current = await setup()
    expect(current.resolve({ name, params })).toMatchObject({ name, path })
    expect(current.resolve(path).matched.some((record) => record.name === name)).toBe(true)
  })

  it("keeps nested layout records, parameter props and static route precedence", async () => {
    const current = await setup()
    const image = current.resolve("/dashboard/images/photo/edit")
    expect(image.matched.map((record) => record.path)).toEqual([
      "/dashboard",
      "/dashboard/images",
      "/dashboard/images/:id/edit"
    ])
    expect(image.meta.requiresAuth).toBe(true)
    for (const name of [
      "public-image-view",
      "image-view",
      "image-edit",
      "collection-view",
      "collection-edit",
      "collection-images"
    ]) {
      const resolved = current.resolve({ name, params: { id: "item" } })
      expect(resolved.matched.at(-1)?.props.default).toBe(true)
    }
    expect(current.resolve("/dashboard/images/upload").name).toBe("image-upload")
    expect(current.resolve("/dashboard/images/edit").name).toBe("images-edit")
    expect(current.resolve("/dashboard/collections/new").name).toBe("collection-new")
    expect(current.resolve("/missing").matched.at(-1)?.path).toBe("/:catchAll(.*)")
    expect(current.resolve("/images/photo").meta.requiresAuth).toBeUndefined()
  })

  it.each([null, "", undefined])(
    "redirects protected routes without a token (%s)",
    async (token) => {
      const current = await setup()
      auth.accessToken = token
      await current.push("/dashboard/images/photo")
      expect(current.currentRoute.value.path).toBe("/login")
      await current.push("/signup")
      expect(current.currentRoute.value.path).toBe("/signup")
      await current.push("/dev")
      expect(current.currentRoute.value.path).toBe("/dev")
      await current.push("/")
      expect(current.currentRoute.value.name).toBe("home")
      await current.push("/images/photo")
      expect(current.currentRoute.value.name).toBe("public-image-view")
    }
  )

  it("allows a truthy token, keeps the gallery at root and rechecks auth on each navigation", async () => {
    const current = await setup()
    auth.accessToken = "stored-token"
    await current.push("/")
    expect(current.currentRoute.value.name).toBe("home")
    await current.push("/dashboard")
    expect(current.currentRoute.value.name).toBe("dashboard")
    await current.push("/dashboard/collections/album/images")
    expect(current.currentRoute.value.name).toBe("collection-images")
    auth.accessToken = null
    await current.push("/dashboard/tasks")
    expect(current.currentRoute.value.name).toBe("login")
  })

  it("omits only the dev route in production", async () => {
    const current = await setup(true)
    expect(current.hasRoute("dev")).toBe(false)
    for (const [name] of namedRoutes.filter(([name]) => name !== "dev")) {
      expect(current.hasRoute(name)).toBe(true)
    }
    expect(current.resolve("/dev").matched.at(-1)?.path).toBe("/:catchAll(.*)")
    await current.push("/dashboard")
    expect(current.currentRoute.value.path).toBe("/login")
  })
})
