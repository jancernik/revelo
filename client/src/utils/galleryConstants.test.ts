import { describe, expect, it } from "vitest"

import {
  MAX_COLUMNS,
  MIN_COLUMNS,
  SPACING_BASE,
  SPACING_SMALL,
  TRANSITION_DURATION_DESKTOP,
  TRANSITION_DURATION_MOBILE,
  transitionDuration,
  USER_INACTIVITY_TIMEOUT,
  ZOOM_DURATION
} from "#src/utils/galleryConstants"

describe("galleryConstants", () => {
  it("uses the shorter fullscreen transition on mobile", () => {
    expect(transitionDuration(true)).toBe(TRANSITION_DURATION_MOBILE)
    expect(transitionDuration(false)).toBe(TRANSITION_DURATION_DESKTOP)
    expect(TRANSITION_DURATION_MOBILE).toBe(0.35)
    expect(TRANSITION_DURATION_DESKTOP).toBe(0.5)
  })

  it("keeps the layout and timing values the galleries depend on", () => {
    expect({ MAX_COLUMNS, MIN_COLUMNS, SPACING_BASE, SPACING_SMALL }).toEqual({
      MAX_COLUMNS: 5,
      MIN_COLUMNS: 2,
      SPACING_BASE: 20,
      SPACING_SMALL: 8
    })
    expect(USER_INACTIVITY_TIMEOUT).toBe(3000)
    expect(ZOOM_DURATION).toBe(0.2)
  })
})
