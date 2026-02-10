import type { Container } from 'pixi.js'
import { clamp } from './animations'

export type CameraState = {
  x: number
  y: number
  zoom: number
  minZoom: number
  maxZoom: number
}

export function createCameraState(): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.6,
    maxZoom: 2,
  }
}

export function panCamera(camera: CameraState, dx: number, dy: number) {
  camera.x += dx
  camera.y += dy
}

export function setZoom(camera: CameraState, zoom: number) {
  camera.zoom = clamp(zoom, camera.minZoom, camera.maxZoom)
}

export function zoomAtPoint(
  camera: CameraState,
  screenX: number,
  screenY: number,
  delta: number,
) {
  const previousZoom = camera.zoom
  setZoom(camera, camera.zoom + delta)
  const nextZoom = camera.zoom

  const worldX = (screenX - camera.x) / previousZoom
  const worldY = (screenY - camera.y) / previousZoom

  camera.x = screenX - worldX * nextZoom
  camera.y = screenY - worldY * nextZoom
}

export function applyCamera(container: Container, camera: CameraState) {
  container.position.set(camera.x, camera.y)
  container.scale.set(camera.zoom)
}
