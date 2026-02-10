import { Container, Graphics } from 'pixi.js'
import { generateBoardGraph, type BoardConfig } from './boardGenerator'

export type BoardRenderResult = {
  container: Container
  graph: ReturnType<typeof generateBoardGraph>
}

const nodeFill = 0x0d101b

export function createBoard(config: BoardConfig): BoardRenderResult {
  const container = new Container()
  const graph = generateBoardGraph(config)
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]))
  const zoneMap = new Map(graph.zones.map((zone) => [zone.id, zone]))

  const mainNodes = graph.mainPath
    .map((id) => nodeMap.get(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
  const mainSet = new Set(mainNodes.map((node) => node.id))
  const mainRotation = new Map<string, number>()
  if (mainNodes.length > 1) {
    mainNodes.forEach((node, index) => {
      const next = mainNodes[(index + 1) % mainNodes.length]
      const angle = Math.atan2(next.y - node.y, next.x - node.x)
      mainRotation.set(node.id, angle)
    })
  }

  const zoneLayer = new Container()
  graph.zones.forEach((zone) => {
    const zoneNodes = graph.nodes.filter(
      (node) => node.zoneId === zone.id && node.type !== 'branch',
    )
    if (!zoneNodes.length) return
    const centerX =
      zoneNodes.reduce((sum, node) => sum + node.x, 0) / zoneNodes.length
    const centerY =
      zoneNodes.reduce((sum, node) => sum + node.y, 0) / zoneNodes.length
    const radius =
      Math.max(
        ...zoneNodes.map((node) =>
          Math.hypot(node.x - centerX, node.y - centerY),
        ),
      ) + 60

    const glow = new Graphics()
    glow.beginFill(zone.color, 0.08)
    glow.drawCircle(centerX, centerY, radius)
    glow.endFill()
    zoneLayer.addChild(glow)
  })
  container.addChild(zoneLayer)

  const edgeLayer = new Graphics()
  if (mainNodes.length > 2) {
    const midPoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    })

    const firstMid = midPoint(mainNodes[0], mainNodes[1])
    edgeLayer.lineStyle(2.4, 0x6dd3ff, 0.5)
    edgeLayer.moveTo(firstMid.x, firstMid.y)

    for (let i = 1; i < mainNodes.length; i += 1) {
      const current = mainNodes[i]
      const next = mainNodes[(i + 1) % mainNodes.length]
      const nextMid = midPoint(current, next)
      edgeLayer.quadraticCurveTo(current.x, current.y, nextMid.x, nextMid.y)
    }
    edgeLayer.closePath()
  }

  graph.edges.forEach((edge) => {
    if (edge.type === 'main') return
    const from = nodeMap.get(edge.from)
    const to = nodeMap.get(edge.to)
    if (!from || !to) return
    const zone = zoneMap.get(from.zoneId)
    if (edge.type === 'branch') {
      edgeLayer.lineStyle(1.4, zone?.accent ?? 0xfff2a6, 0.3)
    } else {
      edgeLayer.lineStyle(1.6, 0xfff2a6, 0.4)
    }
    edgeLayer.moveTo(from.x, from.y)
    edgeLayer.lineTo(to.x, to.y)
  })
  container.addChild(edgeLayer)

  const nodeLayer = new Container()
  graph.nodes.forEach((node) => {
    const zone = zoneMap.get(node.zoneId)
    const color = zone?.accent ?? 0x2bffd1
    const graphic = new Graphics()
    const isBranch = node.type === 'branch'
    const isMain = mainSet.has(node.id)
    const rotation = isMain ? mainRotation.get(node.id) ?? 0 : 0

    const drawTile = (size: number, radius: number) => {
      graphic.drawRoundedRect(-size / 2, -size / 2, size, size, radius)
    }

    if (node.type === 'checkpoint') {
      graphic.lineStyle(2, 0xffd27a, 0.9)
      graphic.beginFill(nodeFill, 0.95)
      drawTile(22, 4)
      graphic.endFill()
      graphic.lineStyle(1, 0xffd27a, 0.7)
      drawTile(30, 6)
    } else if (node.type === 'bonus') {
      graphic.lineStyle(1.5, 0x2bffd1, 0.9)
      graphic.beginFill(0x10231f, 0.95)
      drawTile(14, 4)
      graphic.endFill()
    } else if (node.type === 'challenge') {
      graphic.lineStyle(1.5, 0xff5f6d, 0.9)
      graphic.beginFill(0x2b0f16, 0.95)
      drawTile(14, 4)
      graphic.endFill()
    } else if (node.type === 'start') {
      graphic.lineStyle(2, 0xffffff, 0.9)
      graphic.beginFill(color, 0.95)
      drawTile(18, 5)
      graphic.endFill()
    } else {
      graphic.lineStyle(1, color, isBranch ? 0.4 : 0.7)
      graphic.beginFill(nodeFill, isBranch ? 0.6 : 0.9)
      drawTile(isBranch ? 8 : 12, isBranch ? 2 : 3)
      graphic.endFill()
    }

    graphic.rotation = rotation
    graphic.x = node.x
    graphic.y = node.y
    nodeLayer.addChild(graphic)
  })

  container.addChild(nodeLayer)

  return { container, graph }
}
