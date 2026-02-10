export type BoardZone = {
  id: string
  name: string
  color: number
  accent: number
}

export type BoardNodeType =
  | 'start'
  | 'normal'
  | 'bonus'
  | 'challenge'
  | 'checkpoint'
  | 'branch'

export type BoardNode = {
  id: string
  index: number
  x: number
  y: number
  zoneId: string
  type: BoardNodeType
}

export type BoardEdge = {
  from: string
  to: string
  type: 'main' | 'branch' | 'shortcut'
}

export type BoardBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

export type BoardGraph = {
  nodes: BoardNode[]
  edges: BoardEdge[]
  zones: BoardZone[]
  mainPath: string[]
  bounds: BoardBounds
}

export type BoardConfig = {
  days: number
  estimatedDailyMoves: number
  seed?: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const createRng = (seed: number) => {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const zones: BoardZone[] = [
  { id: 'sapientia', name: 'Sapientia', color: 0x3f7cff, accent: 0xffd27a },
  { id: 'corpus', name: 'Corpus', color: 0xff5f6d, accent: 0x6dff8a },
  { id: 'mens', name: 'Mens', color: 0x9b5dff, accent: 0x76d4ff },
  {
    id: 'productivitas',
    name: 'Productivitas',
    color: 0xff9f43,
    accent: 0xffd479,
  },
  {
    id: 'nexus',
    name: 'Nexus Humanae',
    color: 0xff5db1,
    accent: 0xffb4d9,
  },
  { id: 'opes', name: 'Opes', color: 0x1ec98f, accent: 0x0f5e3f },
  { id: 'spiritus', name: 'Spiritus', color: 0xe9f0ff, accent: 0x7aa6ff },
]

const calcBounds = (nodes: BoardNode[]): BoardBounds => {
  if (!nodes.length) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
  }

  let minX = nodes[0].x
  let maxX = nodes[0].x
  let minY = nodes[0].y
  let maxY = nodes[0].y

  nodes.forEach((node) => {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y)
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const buildZoneMap = (totalNodes: number) => {
  const segment = Math.floor(totalNodes / zones.length)
  const remainder = totalNodes % zones.length
  const zoneForIndex = new Map<number, BoardZone>()

  let cursor = 0
  zones.forEach((zone, idx) => {
    const length = segment + (idx < remainder ? 1 : 0)
    for (let i = 0; i < length; i += 1) {
      zoneForIndex.set(cursor, zone)
      cursor += 1
    }
  })

  return zoneForIndex
}

const smoothPoints = (points: Array<{ x: number; y: number }>, passes = 2) => {
  let result = points
  for (let pass = 0; pass < passes; pass += 1) {
    result = result.map((point, index) => {
      const prev = result[(index - 1 + result.length) % result.length]
      const next = result[(index + 1) % result.length]
      return {
        x: (prev.x + point.x * 2 + next.x) / 4,
        y: (prev.y + point.y * 2 + next.y) / 4,
      }
    })
  }
  return result
}

export function generateBoardGraph(config: BoardConfig): BoardGraph {
  const days = Math.max(1, config.days)
  const estimatedMoves = Math.max(2, config.estimatedDailyMoves)
  const seed =
    config.seed ?? Math.floor(estimatedMoves * 1000) + Math.floor(days * 97)
  const rng = createRng(seed)

  const minNodes = days * 5
  const maxNodes = days * 12
  const totalNodes = clamp(Math.round(estimatedMoves * days), minNodes, maxNodes)

  const zoneMap = buildZoneMap(totalNodes)
  const mainPath: string[] = []
  const nodes: BoardNode[] = []
  const edges: BoardEdge[] = []

  const baseRadius = 220
  const xScale = 1.15
  const yScale = 0.9
  const wobblePhase = rng() * Math.PI * 2

  const rawPoints = Array.from({ length: totalNodes }, (_, index) => {
    const angle = (index / totalNodes) * Math.PI * 2
    const pulse = Math.sin(angle * 2 + wobblePhase) * 22
    const noise = rng() * 36 - 18
    const radius = baseRadius + pulse + noise
    return {
      x: Math.cos(angle) * radius * xScale,
      y: Math.sin(angle) * radius * yScale,
    }
  })

  const smoothedPoints = smoothPoints(rawPoints, 3)

  for (let i = 0; i < totalNodes; i += 1) {
    const zone = zoneMap.get(i) ?? zones[0]
    const id = `m-${i}`
    const point = smoothedPoints[i]

    nodes.push({
      id,
      index: i,
      x: point.x,
      y: point.y,
      zoneId: zone.id,
      type: 'normal',
    })
    mainPath.push(id)
  }

  const nodesPerDay = totalNodes / days
  const checkpointIndices = new Set<number>()
  const weekMarks = [7, 14]
  weekMarks.forEach((mark) => {
    if (days >= mark) {
      checkpointIndices.add(Math.max(0, Math.round(mark * nodesPerDay) - 1))
    }
  })

  nodes.forEach((node) => {
    if (node.index === 0) {
      node.type = 'start'
      return
    }
    if (checkpointIndices.has(node.index)) {
      node.type = 'checkpoint'
      return
    }
    const roll = rng()
    if (roll < 0.08) {
      node.type = 'bonus'
    } else if (roll < 0.16) {
      node.type = 'challenge'
    }
  })

  for (let i = 0; i < totalNodes; i += 1) {
    const next = (i + 1) % totalNodes
    edges.push({
      from: mainPath[i],
      to: mainPath[next],
      type: 'main',
    })
  }

  const branchCount = clamp(Math.floor(totalNodes / 70) + 1, 1, 3)
  const usedStarts = new Set<number>()

  for (let b = 0; b < branchCount; b += 1) {
    let startIndex = Math.floor(rng() * (totalNodes - 24)) + 8
    let guard = 0
    while (usedStarts.has(startIndex) && guard < 20) {
      startIndex = Math.floor(rng() * (totalNodes - 24)) + 8
      guard += 1
    }
    usedStarts.add(startIndex)

    const branchLength = Math.floor(rng() * 4) + 4
    const rejoinOffset = branchLength + Math.floor(rng() * 6) + 4
    const rejoinIndex = Math.min(totalNodes - 2, startIndex + rejoinOffset)

    const startNode = nodes[startIndex]
    const endNode = nodes[rejoinIndex]
    const dx = endNode.x - startNode.x
    const dy = endNode.y - startNode.y
    const dist = Math.hypot(dx, dy) || 1
    const nx = -dy / dist
    const ny = dx / dist
    const offsetMag = 60 + rng() * 40
    const zoneId = startNode.zoneId

    let prevId = startNode.id
    for (let i = 0; i < branchLength; i += 1) {
      const t = (i + 1) / (branchLength + 1)
      const curve = Math.sin(Math.PI * t) * offsetMag
      const x = startNode.x + dx * t + nx * curve
      const y = startNode.y + dy * t + ny * curve
      const id = `b-${startIndex}-${i}`
      nodes.push({
        id,
        index: totalNodes + i,
        x,
        y,
        zoneId,
        type: 'branch',
      })
      edges.push({ from: prevId, to: id, type: 'branch' })
      prevId = id
    }
    edges.push({ from: prevId, to: endNode.id, type: 'branch' })
  }

  const shortcutCount = clamp(Math.floor(totalNodes / 90) + 1, 1, 2)
  for (let s = 0; s < shortcutCount; s += 1) {
    const startIndex = Math.floor(rng() * (totalNodes - 30)) + 6
    const endIndex = Math.min(
      totalNodes - 1,
      startIndex + Math.floor(rng() * 10) + 12,
    )
    edges.push({
      from: mainPath[startIndex],
      to: mainPath[endIndex],
      type: 'shortcut',
    })
  }

  return {
    nodes,
    edges,
    zones,
    mainPath,
    bounds: calcBounds(nodes),
  }
}
