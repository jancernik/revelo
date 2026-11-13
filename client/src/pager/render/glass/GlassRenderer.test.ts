import * as THREE from "three"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PagerFrame } from "../../types"
import type { SlideSource } from "../types"

import { GlassRenderer } from "./GlassRenderer"

const gpu = vi.hoisted(() => ({ setPixelRatio: vi.fn(), setSize: vi.fn() }))

vi.mock("three", async (original) => ({
  ...(await original<typeof THREE>()),
  WebGLRenderer: class {
    capabilities = { getMaxAnisotropy: () => 16 }
    dispose = vi.fn()
    render = vi.fn()
    setPixelRatio = gpu.setPixelRatio
    setSize = gpu.setSize
  }
}))

const frame = (from: number, to: null | number = null): PagerFrame => ({
  axis: "y",
  direction: 1,
  flow: { bulge: 0, lag: new Float32Array(32) },
  from,
  phase: to === null ? "idle" : "settling",
  progress: to === null ? 0 : 0.3,
  time: 0,
  to,
  touch: null,
  velocity: 0
})

const renderers: GlassRenderer[] = []
const setup = () => {
  const images = Array.from({ length: 12 }, () => document.createElement("canvas"))
  const slides: SlideSource = {
    count: images.length,
    get: (index) => (images[index] ? { aspect: 1, image: images[index] } : undefined)
  }
  const renderer = new GlassRenderer(document.createElement("canvas"))
  renderers.push(renderer)
  renderer.resize(600, 800, 2)
  const drawing = vi.spyOn(THREE.Scene.prototype, "add")
  const uniforms = () => {
    const mesh = drawing.mock.calls.at(-1)![0] as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >
    return mesh.material.uniforms
  }
  return { images, renderer, slides, uniforms }
}

afterEach(() => {
  for (const renderer of renderers.splice(0)) renderer.dispose()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe("GlassRenderer resources", () => {
  it("caps the drawing-buffer resolution independently of CSS size", () => {
    const { renderer } = setup()
    renderer.resize(600, 800, 8)
    expect(gpu.setPixelRatio).toHaveBeenLastCalledWith(3)
    expect(gpu.setSize).toHaveBeenLastCalledWith(600, 800, false)
  })

  it("renders an empty source without requesting a nonexistent item", () => {
    const { renderer, uniforms } = setup()
    const get = vi.fn(() => undefined)
    renderer.render(frame(-1), { count: 0, get })
    expect(get).not.toHaveBeenCalled()
    expect(uniforms().uFromReady.value).toBe(0)
    expect(uniforms().uFromRect.value.z).toBe(0)
  })

  it("retains both active textures across a distant jump", () => {
    const { renderer, slides, uniforms } = setup()
    const dispose = vi.spyOn(THREE.Texture.prototype, "dispose")
    renderer.render(frame(0, 9), slides)
    const incoming = uniforms().uToTex.value
    expect(dispose).not.toHaveBeenCalled()
    renderer.render(frame(0, 9), slides)
    expect(uniforms().uToTex.value).toBe(incoming)
    renderer.render(frame(9), slides)
    expect(uniforms().uFromTex.value).toBe(incoming)
    expect(dispose.mock.contexts).not.toContain(incoming)
    renderer.dispose()
    renderers.length = 0
    expect(dispose.mock.contexts.filter((texture) => texture === incoming)).toHaveLength(1)
  })

  it("reuses pixels, disposes replacements and evicts distant inactive textures", () => {
    const { images, renderer, slides, uniforms } = setup()
    renderer.render(frame(0), slides)
    const first = uniforms().uFromTex.value as THREE.Texture
    const disposeFirst = vi.spyOn(first, "dispose")
    renderer.render(frame(0), slides)
    expect(uniforms().uFromTex.value).toBe(first)
    images[0] = document.createElement("canvas")
    renderer.render(frame(0), slides)
    expect(disposeFirst).toHaveBeenCalledTimes(1)
    const replacement = uniforms().uFromTex.value as THREE.Texture
    const disposeReplacement = vi.spyOn(replacement, "dispose")
    renderer.render(frame(10), slides)
    expect(disposeReplacement).toHaveBeenCalledTimes(1)
    const current = uniforms().uFromTex.value as THREE.Texture
    const disposeCurrent = vi.spyOn(current, "dispose")
    renderer.dispose()
    renderers.length = 0
    expect(disposeCurrent).toHaveBeenCalledTimes(1)
  })

  it("rebuilds geometry only when the front point count changes", () => {
    const { renderer, slides } = setup()
    const add = vi.spyOn(THREE.Scene.prototype, "add")
    const disposeGeometry = vi.spyOn(THREE.PlaneGeometry.prototype, "dispose")
    const disposeMaterial = vi.spyOn(THREE.ShaderMaterial.prototype, "dispose")
    renderer.render(frame(0), slides)
    renderer.render(frame(0, 1), slides)
    expect(add).toHaveBeenCalledTimes(1)
    const next = frame(0, 1)
    next.flow.lag = new Float32Array(16)
    renderer.render(next, slides)
    expect(add).toHaveBeenCalledTimes(2)
    expect(disposeGeometry).toHaveBeenCalledTimes(1)
    expect(disposeMaterial).toHaveBeenCalledTimes(1)
  })
})
