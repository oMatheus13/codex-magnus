import { Container, Graphics } from 'pixi.js'
import { generateBoardGraph, type BoardConfig } from './boardGenerator'

export type BoardRenderResult = {
  container: Container
  graph: ReturnType<typeof generateBoardGraph>
}

const nodeFill = 0x0d101b

const midPoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export function createBoard(config: BoardConfig): BoardRenderResult {
  const container = new Container()
  const graph = generateBoardGraph(config)
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]))
  const zoneMap = new Map(graph.zones.map((zone) => [zone.id, zone]))

  const mainNodes = graph.mainPath
    .map((id) => nodeMap.get(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
  const mainSet = new Set(mainNodes.map((node) => node.id))

  const zoneLayer = new Container()
  graph.zones.forEach((zone) => {
    const zoneNodes = graph.nodes.filter((node) => node.zoneId === zone.id)
    if (!zoneNodes.length) return

    const minX = Math.min(...zoneNodes.map((node) => node.x))
    const maxX = Math.max(...zoneNodes.map((node) => node.x))
    const minY = Math.min(...zoneNodes.map((node) => node.y))
    const maxY = Math.max(...zoneNodes.map((node) => node.y))
    const padding = 120

    const glow = new Graphics()
    glow.beginFill(zone.color, 0.07)
    glow.drawRoundedRect(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2,
      140,
    )
    glow.endFill()
    zoneLayer.addChild(glow)
  })
  container.addChild(zoneLayer)

  const edgeLayer = new Graphics()
  if (mainNodes.length > 1) {
    edgeLayer.lineStyle(4, 0x6dd3ff, 0.35)
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

  graph.edges.forEach((edge) => {
    if (edge.type !== 'branch') return
    const from = nodeMap.get(edge.from)
    const to = nodeMap.get(edge.to)
    if (!from || !to) return
    const zone = zoneMap.get(from.zoneId)
    edgeLayer.lineStyle(2, zone?.accent ?? 0xfff2a6, 0.4)
    edgeLayer.moveTo(from.x, from.y)
    edgeLayer.lineTo(to.x, to.y)
  })
  container.addChild(edgeLayer)

  const nodeLayer = new Container()
  graph.nodes.forEach((node) => {
    const zone = zoneMap.get(node.zoneId)
    const accent = zone?.accent ?? 0x2bffd1
    const graphic = new Graphics()
    const isMain = mainSet.has(node.id)

    const drawCircle = (radius: number) => {
      graphic.drawCircle(0, 0, radius)
    }

    if (node.type === 'checkpoint') {
      graphic.lineStyle(2, 0xffd27a, 0.9)
      graphic.beginFill(nodeFill, 0.95)
      drawCircle(12)
      graphic.endFill()
      graphic.lineStyle(1.5, 0xffd27a, 0.7)
      drawCircle(18)
    } else if (node.type === 'bonus') {
      graphic.lineStyle(2, 0x2bffd1, 0.9)
      graphic.beginFill(0x10231f, 0.95)
      drawCircle(isMain ? 10 : 8)
      graphic.endFill()
    } else if (node.type === 'challenge') {
      graphic.lineStyle(2, 0xff5f6d, 0.9)
      graphic.beginFill(0x2b0f16, 0.95)
      drawCircle(isMain ? 10 : 8)
      graphic.endFill()
    } else if (node.type === 'start') {
      graphic.lineStyle(2, 0xffffff, 0.95)
      graphic.beginFill(accent, 0.95)
      drawCircle(12)
      graphic.endFill()
    } else {
      graphic.lineStyle(1.6, accent, isMain ? 0.7 : 0.4)
      graphic.beginFill(nodeFill, isMain ? 0.9 : 0.55)
      drawCircle(isMain ? 8 : 6)
      graphic.endFill()
    }

    graphic.x = node.x
    graphic.y = node.y
    nodeLayer.addChild(graphic)
  })

  container.addChild(nodeLayer)

  return { container, graph }
}
