export type Easing = (t: number) => number

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t
}

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3)

export function tween(
  durationMs: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
  easing: Easing = easeOutCubic,
) {
  let startTime = 0
  let frameId = 0

  const tick = (now: number) => {
    if (!startTime) {
      startTime = now
    }
    const elapsed = now - startTime
    const t = clamp(elapsed / durationMs, 0, 1)
    onUpdate(easing(t))

    if (t < 1) {
      frameId = requestAnimationFrame(tick)
    } else if (onComplete) {
      onComplete()
    }
  }

  frameId = requestAnimationFrame(tick)

  return () => cancelAnimationFrame(frameId)
}
