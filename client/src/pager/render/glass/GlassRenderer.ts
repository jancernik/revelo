import * as THREE from "three"

import type { DeepPartial, PagerFrame, Size } from "../../types"
import type { Renderer, SlideSource } from "../types"

import { mergeConfig } from "../../config"
import { clamp, smoothstep } from "../../math"
import { fitRect, layoutRects, type Rect } from "../layout"
import { GLASS_DEFAULTS, type GlassConfig } from "./config"
import { glassFragment, glassVertex } from "./shaders"

/** Textures this many items away from the current one are dropped. */
const KEEP_DISTANCE = 4
/** Pixels of bend per unit of speed, and the most the images bend. */
const BEND = { limit: 40, rate: 0.012 }
const MAX_ANISOTROPY = 8

interface Cached {
  image: TexImageSource
  texture: THREE.Texture
}

/** Draws the glass transition between two items on a canvas, through three.js. */
export class GlassRenderer implements Renderer {
  private blank: THREE.DataTexture
  private camera = new THREE.Camera()
  private config: GlassConfig
  private quad: null | THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> = null
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private textures = new Map<number, Cached>()
  private uniforms: Record<string, THREE.IUniform>
  private viewport: Size = { height: 1, width: 1 }

  constructor(canvas: HTMLCanvasElement, config?: DeepPartial<GlassConfig>) {
    this.config = mergeConfig(GLASS_DEFAULTS, config)
    this.renderer = new THREE.WebGLRenderer({ antialias: false, canvas })
    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    this.blank.needsUpdate = true
    this.uniforms = {
      uAxis: { value: 0 },
      uBackdrop: { value: 1 },
      uBackground: { value: new THREE.Vector3() },
      uBend: { value: 0 },
      uClipTravel: { value: 1 },
      uDirection: { value: 1 },
      uDrift: { value: 1 },
      uFromClip: { value: new THREE.Vector4() },
      uFromReady: { value: 0 },
      uFromRect: { value: new THREE.Vector4() },
      uFromTex: { value: this.blank },
      uFront: { value: new Float32Array(1) },
      uFrontAmount: { value: 0 },
      uFrontShape: { value: 0 },
      uGlassBulge: { value: 0 },
      uGlassDispersion: { value: 0 },
      uGlassFrost: { value: 0 },
      uGlassLens: { value: 0 },
      uGlassRefraction: { value: 0 },
      uGlassShine: { value: 0 },
      uGlassThickness: { value: 1 },
      uProgress: { value: 0 },
      uRadius: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uToClip: { value: new THREE.Vector4() },
      uToReady: { value: 0 },
      uToRect: { value: new THREE.Vector4() },
      uToTex: { value: this.blank },
      uTouch: { value: new THREE.Vector2() }
    }
    this.applyConfig()
  }

  dispose(): void {
    for (const { texture } of this.textures.values()) texture.dispose()
    this.textures.clear()
    this.quad?.geometry.dispose()
    this.quad?.material.dispose()
    this.blank.dispose()
    this.renderer.dispose()
  }

  render(frame: PagerFrame, slides: SlideSource): void {
    this.ensureQuad(frame.flow.lag.length)
    const u = this.uniforms
    const { height, width } = this.viewport
    const { layout } = this.config
    const { from, to } = frame

    const fromTexture = this.textureFor(from, slides)
    const toTexture = to === null ? null : this.textureFor(to, slides)
    const rects = layoutRects(layout.mode, this.rectFor(from, slides), this.rectFor(to, slides), {
      morph: smoothstep(0, 1, frame.progress),
      overfill: layout.morph.overfill
    })

    u.uFromTex.value = fromTexture ?? this.blank
    u.uFromReady.value = fromTexture ? 1 : 0
    u.uFromRect.value.set(...rects.from.image)
    u.uFromClip.value.set(...rects.from.clip)
    u.uToTex.value = toTexture ?? this.blank
    u.uToReady.value = toTexture ? 1 : 0
    u.uToRect.value.set(...rects.to.image)
    u.uToClip.value.set(...rects.to.clip)

    const span = frame.axis === "y" ? height : width
    u.uProgress.value = frame.progress
    u.uDirection.value = frame.direction
    u.uAxis.value = frame.axis === "x" ? 1 : 0
    u.uBend.value =
      clamp(frame.velocity * span * BEND.rate, -BEND.limit, BEND.limit) * this.config.bend
    u.uFront.value = frame.flow.lag
    u.uFrontShape.value = frame.flow.bulge
    u.uTouch.value.set(frame.touch?.x ?? width / 2, frame.touch?.y ?? height / 2)

    this.evict(from, to)
    this.renderer.render(this.scene, this.camera)
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.viewport = { height, width }
    this.renderer.setPixelRatio(Math.min(pixelRatio, this.config.maxPixelRatio))
    this.renderer.setSize(width, height, false)
    this.uniforms.uResolution.value.set(width, height)
  }

  setConfig(config: DeepPartial<GlassConfig>): void {
    this.config = mergeConfig(this.config, config)
    this.applyConfig()
  }

  private applyConfig(): void {
    const { backdrop, background, layout, look, trail } = this.config
    const u = this.uniforms
    u.uBackdrop.value = backdrop === "blur" ? 1 : 0
    u.uBackground.value.set(...background)
    u.uRadius.value = layout.radius
    const morph = layout.mode === "morph"
    u.uClipTravel.value = morph ? 0 : 1
    u.uDrift.value = morph ? layout.morph.drift : 1
    u.uGlassBulge.value = look.bulge
    u.uGlassDispersion.value = look.dispersion
    u.uGlassFrost.value = look.frost
    u.uGlassLens.value = look.lens
    u.uGlassRefraction.value = look.refraction
    u.uGlassShine.value = look.shine
    u.uGlassThickness.value = Math.max(1, look.thickness)
    u.uFrontAmount.value = look.bulge * trail
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.config.maxPixelRatio))
  }

  // The shader's front array is sized at compile time, so the quad is built
  // once the flow's point count is known.
  private ensureQuad(points: number): void {
    if (this.quad && this.uniforms.uFront.value.length === points) return
    this.quad?.geometry.dispose()
    this.quad?.material.dispose()
    if (this.quad) this.scene.remove(this.quad)
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        fragmentShader: glassFragment(points),
        uniforms: this.uniforms,
        vertexShader: glassVertex
      })
    )
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  private evict(current: number, incoming: null | number): void {
    for (const [index, cached] of this.textures) {
      if (index === incoming || Math.abs(index - current) <= KEEP_DISTANCE) continue
      cached.texture.dispose()
      this.textures.delete(index)
    }
  }

  // The item's frame: fitted inside the insets, or a point at the centre when there is none.
  private rectFor(index: null | number, slides: SlideSource): Rect {
    const { height, width } = this.viewport
    const slide =
      index === null || index < 0 || index >= slides.count ? undefined : slides.get(index)
    if (!slide) return [width / 2, height / 2, 0, 0]
    const { bottom, left, right, top } = this.config.layout.insets
    return fitRect(slide.aspect, [left, top, width - left - right, height - top - bottom])
  }

  private textureFor(index: number, slides: SlideSource): null | THREE.Texture {
    if (index < 0 || index >= slides.count) return null
    const image = slides.get(index)?.image
    if (!image) return null
    const cached = this.textures.get(index)
    if (cached?.image === image) return cached.texture
    cached?.texture.dispose()
    const texture = new THREE.Texture(image)
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.anisotropy = Math.min(MAX_ANISOTROPY, this.renderer.capabilities.getMaxAnisotropy())
    texture.needsUpdate = true
    this.textures.set(index, { image, texture })
    return texture
  }
}
