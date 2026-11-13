export { mergeConfig, PAGER_DEFAULTS, REDUCED_MOTION } from "./config"
export type {
  CatchConfig,
  FlowConfig,
  FollowConfig,
  FrontConfig,
  GestureConfig,
  MotionConfig,
  PagerConfig,
  SwipeConfig
} from "./config"
export { PagerEngine } from "./engine"
export type { EngineOptions } from "./engine"
export { createHaptics, silentHaptics } from "./haptics"
export type { Haptics } from "./haptics"
export { PagerModel } from "./model"
export { default as Pager } from "./Pager.vue"
export { GLASS_DEFAULTS } from "./render/glass/config"
export type { GlassConfig, GlassLook, Insets, LayoutConfig } from "./render/glass/config"
export { GlassRenderer } from "./render/glass/GlassRenderer"
export type { LayoutMode, Rect } from "./render/layout"
export type { Renderer, Slide, SlideSource } from "./render/types"
export type {
  Axis,
  DeepPartial,
  Direction,
  FlowState,
  Neighbor,
  PagerFrame,
  Phase,
  Point
} from "./types"
