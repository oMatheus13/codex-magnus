export type PanHandler = (dx: number, dy: number) => void

export type PanOptions = {
  shouldStart?: (event: PointerEvent) => boolean
}

export function attachPanHandlers(
  target: HTMLElement,
  onPan: PanHandler,
  options: PanOptions = {},
): () => void {
  let isActive = false
  let lastX = 0
  let lastY = 0

  const onPointerDown = (event: PointerEvent) => {
    if (options.shouldStart && !options.shouldStart(event)) {
      return
    }
    isActive = true
    lastX = event.clientX
    lastY = event.clientY
    target.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isActive) return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    onPan(dx, dy)
  }

  const onPointerUp = (event: PointerEvent) => {
    isActive = false
    target.releasePointerCapture(event.pointerId)
  }

  target.addEventListener('pointerdown', onPointerDown)
  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', onPointerUp)

  return () => {
    target.removeEventListener('pointerdown', onPointerDown)
    target.removeEventListener('pointermove', onPointerMove)
    target.removeEventListener('pointerup', onPointerUp)
    target.removeEventListener('pointercancel', onPointerUp)
  }
}
