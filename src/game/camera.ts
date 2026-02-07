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

export function applyCamera(container: Container, camera: CameraState) {
  container.position.set(camera.x, camera.y)
  container.scale.set(camera.zoom)
}
