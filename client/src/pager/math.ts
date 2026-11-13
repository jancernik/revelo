export interface Sample {
  t: number
  value: number
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Damped spring step, critically damped by default; stable for any frame time. */
export function springStep(
  position: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number,
  damping = 1
): { position: number; velocity: number } {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  let x = position
  let v = velocity
  for (let i = 0; i < steps; i++) {
    const acceleration = omega * omega * (target - x) - 2 * damping * omega * v
    v += acceleration * h
    x += v * h
  }
  return { position: x, velocity: v }
}

/** Velocity over the trailing window of samples, in units per second. */
export function trailingVelocity(samples: Sample[], windowMs: number): number {
  if (samples.length < 2) return 0
  const last = samples[samples.length - 1]
  let first = last
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break
    first = samples[i]
  }
  const elapsed = (last.t - first.t) / 1000
  return elapsed > 0 ? (last.value - first.value) / elapsed : 0
}
