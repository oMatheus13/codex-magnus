import { BLEND_MODES, BlurFilter, Container, Graphics } from 'pixi.js'
import { generateBoardGraph, type BoardConfig } from './boardGenerator'

export type BoardRenderResult = {
  container: Container
  graph: ReturnType<typeof generateBoardGraph>
  ambientParticles: AmbientParticle[]
  zoomFilters: ZoomFilter[]
}

const nodeFill = 0x0d101b

const midPoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

type AmbientParticle = {
  graphic: Graphics
  baseX: number
  baseY: number
  driftX: number
  driftY: number
  phase: number
  speed: number
}

type ZoomFilter = {
  filter: BlurFilter
  baseBlur: number
}

const seeded = (seed: number) => {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function createBoard(config: BoardConfig): BoardRenderResult {
  const container = new Container()
  const graph = generateBoardGraph(config)
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]))
  const zoneMap = new Map(graph.zones.map((zone) => [zone.id, zone]))
  const zoomFilters: ZoomFilter[] = []

  const mainNodes = graph.mainPath
    .map((id) => nodeMap.get(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
  const mainSet = new Set(mainNodes.map((node) => node.id))

  const gridLayer = new Graphics()
  const gridPadding = 240
  const gridSpacing = 80
  const gridMinX = graph.bounds.minX - gridPadding
  const gridMaxX = graph.bounds.maxX + gridPadding
  const gridMinY = graph.bounds.minY - gridPadding
  const gridMaxY = graph.bounds.maxY + gridPadding
  gridLayer.lineStyle(1, 0x14203a, 0.12)
  for (let x = gridMinX; x <= gridMaxX; x += gridSpacing) {
    gridLayer.moveTo(x, gridMinY)
    gridLayer.lineTo(x, gridMaxY)
  }
  for (let y = gridMinY; y <= gridMaxY; y += gridSpacing) {
    gridLayer.moveTo(gridMinX, y)
    gridLayer.lineTo(gridMaxX, y)
  }
  container.addChild(gridLayer)

  const ambientLayer = new Container()
  graph.zones.forEach((zone) => {
    const zoneNodes = graph.nodes.filter((node) => node.zoneId === zone.id)
    if (!zoneNodes.length) return

    const minX = Math.min(...zoneNodes.map((node) => node.x))
    const maxX = Math.max(...zoneNodes.map((node) => node.x))
    const minY = Math.min(...zoneNodes.map((node) => node.y))
    const maxY = Math.max(...zoneNodes.map((node) => node.y))
    const padding = 160
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const radius = Math.max(maxX - minX, maxY - minY) * 0.6 + padding

    const haze = new Graphics()
    haze.beginFill(zone.color, 0.03)
    haze.drawCircle(centerX, centerY, radius)
    haze.endFill()
    const hazeFilter = new BlurFilter(180, 2)
    zoomFilters.push({ filter: hazeFilter, baseBlur: 180 })
    haze.filters = [hazeFilter]
    haze.blendMode = BLEND_MODES.SCREEN
    ambientLayer.addChild(haze)
  })
  container.addChild(ambientLayer)

  const particleLayer = new Container()
  const ambientParticles: AmbientParticle[] = []
  graph.zones.forEach((zone, index) => {
    const zoneNodes = graph.nodes.filter((node) => node.zoneId === zone.id)
    if (!zoneNodes.length) return
    const minX = Math.min(...zoneNodes.map((node) => node.x))
    const maxX = Math.max(...zoneNodes.map((node) => node.x))
    const minY = Math.min(...zoneNodes.map((node) => node.y))
    const maxY = Math.max(...zoneNodes.map((node) => node.y))
    const rng = seeded(zone.id.length * 1000 + index * 97)
    const count = 6

    for (let i = 0; i < count; i += 1) {
      const particle = new Graphics()
      const radius = 10 + rng() * 16
      particle.beginFill(zone.accent, 0.2)
      particle.drawCircle(0, 0, radius)
      particle.endFill()
      const particleFilter = new BlurFilter(8, 2)
      zoomFilters.push({ filter: particleFilter, baseBlur: 8 })
      particle.filters = [particleFilter]
      particle.blendMode = BLEND_MODES.SCREEN

      const baseX = minX + (maxX - minX) * rng()
      const baseY = minY + (maxY - minY) * rng()
      const driftX = 12 + rng() * 20
      const driftY = 10 + rng() * 18
      const phase = rng() * Math.PI * 2
      const speed = 0.2 + rng() * 0.35

      particle.position.set(baseX, baseY)
      particleLayer.addChild(particle)
      ambientParticles.push({
        graphic: particle,
        baseX,
        baseY,
        driftX,
        driftY,
        phase,
        speed,
      })
    }
  })
  container.addChild(particleLayer)

  const zoneLayer = new Container()
  graph.zones.forEach((zone) => {
    const zoneNodes = graph.nodes.filter((node) => node.zoneId === zone.id)
    if (!zoneNodes.length) return

    const minX = Math.min(...zoneNodes.map((node) => node.x))
    const maxX = Math.max(...zoneNodes.map((node) => node.x))
    const minY = Math.min(...zoneNodes.map((node) => node.y))
    const maxY = Math.max(...zoneNodes.map((node) => node.y))
    const padding = 140

    const glow = new Graphics()
    glow.beginFill(zone.color, 0.04)
    glow.drawRoundedRect(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2,
      160,
    )
    glow.endFill()
    const glowFilter = new BlurFilter(120, 2)
    zoomFilters.push({ filter: glowFilter, baseBlur: 120 })
    glow.filters = [glowFilter]
    glow.blendMode = BLEND_MODES.SCREEN
    zoneLayer.addChild(glow)
  })
  container.addChild(zoneLayer)

  const edgeLayer = new Graphics()
  if (mainNodes.length > 1) {
    edgeLayer.lineStyle(1, 0x6dd3ff, 0.08)
    edgeLayer.moveTo(mainNodes[0].x, mainNodes[0].y)

    for (let i = 1; i < mainNodes.length - 1; i += 1) {
      const current = mainNodes[i]
      const next = mainNodes[i + 1]
      const mid = midPoint(current, next)
      edgeLayer.quadraticCurveTo(current.x, current.y, mid.x, mid.y)
    }

    const last = mainNodes[mainNodes.length - 1]
    edgeLayer.lineTo(last.x, last.y)
  }

  container.addChild(edgeLayer)

  const nodeLayer = new Container()
  const angleMap = new Map<string, number>()
  mainNodes.forEach((node, index) => {
    const prev = mainNodes[Math.max(0, index - 1)]
    const next = mainNodes[Math.min(mainNodes.length - 1, index + 1)]
    const dx = (next?.x ?? node.x) - (prev?.x ?? node.x)
    const dy = (next?.y ?? node.y) - (prev?.y ?? node.y)
    angleMap.set(node.id, Math.atan2(dy, dx))
  })
  graph.nodes.forEach((node) => {
    const zone = zoneMap.get(node.zoneId)
    const accent = zone?.accent ?? 0x2bffd1
    const graphic = new Graphics()
    const isMain = mainSet.has(node.id)

    const drawSquare = (size: number, radius = 2) => {
      const half = size / 2
      graphic.drawRoundedRect(-half, -half, size, size, radius)
    }

    if (node.type === 'checkpoint') {
      graphic.lineStyle(2, 0xffd27a, 0.9)
      graphic.beginFill(nodeFill, 0.95)
      drawSquare(24, 3)
      graphic.endFill()
      graphic.lineStyle(1.5, 0xffd27a, 0.7)
      drawSquare(34, 4)
      graphic.lineStyle(1, 0xffffff, 0.12)
      drawSquare(16, 2)
    } else if (node.type === 'bonus') {
      graphic.lineStyle(2, 0x2bffd1, 0.8)
      graphic.beginFill(0x10231f, 0.95)
      drawSquare(isMain ? 18 : 14, 3)
      graphic.endFill()
      graphic.lineStyle(1, 0xffffff, 0.12)
      drawSquare(isMain ? 12 : 9, 2)
    } else if (node.type === 'challenge') {
      graphic.lineStyle(2, 0xff5f6d, 0.8)
      graphic.beginFill(0x2b0f16, 0.95)
      drawSquare(isMain ? 18 : 14, 3)
      graphic.endFill()
      graphic.lineStyle(1, 0xffffff, 0.12)
      drawSquare(isMain ? 12 : 9, 2)
    } else if (node.type === 'start') {
      graphic.lineStyle(2, 0xffffff, 0.95)
      graphic.beginFill(accent, 0.95)
      drawSquare(24, 3)
      graphic.endFill()
      graphic.lineStyle(1, 0xffffff, 0.2)
      drawSquare(16, 2)
    } else {
      graphic.lineStyle(1.4, accent, isMain ? 0.6 : 0.35)
      graphic.beginFill(nodeFill, isMain ? 0.9 : 0.55)
      drawSquare(isMain ? 14 : 10, 2)
      graphic.endFill()
      graphic.lineStyle(1, 0xffffff, isMain ? 0.14 : 0.08)
      drawSquare(isMain ? 9 : 7, 1)
    }

    graphic.x = node.x
    graphic.y = node.y
    graphic.rotation = angleMap.get(node.id) ?? 0
    nodeLayer.addChild(graphic)
  })

  container.addChild(nodeLayer)

  return { container, graph, ambientParticles, zoomFilters }
}
