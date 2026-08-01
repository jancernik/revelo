export const SPACING_BASE = 20 // Space between images and columns in pixels
export const SPACING_SMALL = 8 // Space between images and columns in pixels for small screens

export const MAX_COLUMN_WIDTH = 300 // Maximum width of individual columns in pixels
export const MIN_COLUMNS = 2 // Minimum number of columns to display
export const MAX_COLUMNS = 5 // Maximum number of columns to display
export const MAX_WIDTH = 1600 // Maximum width of the gallery area in pixels

export const VIRTUAL_BUFFER = 400 // Buffer area outside viewport for performance optimization

export const ZOOM_DURATION = 0.2 // Duration for a single image to fade when zooming to detail view

// Must match the fullscreen FLIP duration.
export const TRANSITION_DURATION_MOBILE = 0.35
export const TRANSITION_DURATION_DESKTOP = 0.5

export const transitionDuration = (isMobile) =>
  isMobile ? TRANSITION_DURATION_MOBILE : TRANSITION_DURATION_DESKTOP
