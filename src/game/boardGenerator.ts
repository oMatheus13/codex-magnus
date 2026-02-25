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
  type: 'main' | 'branch'
  label?: string
  branchKind?: 'bonus' | 'challenge' | 'safe'
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

  const lengths = zones.map((_, idx) => segment + (idx < remainder ? 1 : 0))
  const transitions = lengths.map((length) => Math.min(18, Math.floor(length * 0.35)))

  let cursor = 0
  zones.forEach((zone, idx) => {
    const length = lengths[idx]
    const transition = transitions[idx]
    const prevZone = zones[Math.max(0, idx - 1)]
    for (let i = 0; i < length; i += 1) {
      const isTransition = idx > 0 && i < transition
      const picked = isTransition && i % 2 === 0 ? prevZone : zone
      zoneForIndex.set(cursor, picked)
      cursor += 1
    }
  })

  return zoneForIndex
}

const smoothPoints = (points: Array<{ x: number; y: number }>, passes = 2) => {
  let result = points
  for (let pass = 0; pass < passes; pass += 1) {
    result = result.map((point, index) => {
      const prev = result[Math.max(0, index - 1)]
      const next = result[Math.min(result.length - 1, index + 1)]
      return {
        x: (prev.x + point.x * 2 + next.x) / 4,
        y: (prev.y + point.y * 2 + next.y) / 4,
      }
    })
  }
  return result
}

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

const randomInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min

export function generateBoardGraph(config: BoardConfig): BoardGraph {
  const days = Math.max(1, config.days)
  const estimatedMoves = Math.max(2, config.estimatedDailyMoves)
  const seed =
    config.seed ?? Math.floor(estimatedMoves * 1000) + Math.floor(days * 97)
  const rng = createRng(seed)

  const density = 2.4
  const minNodes = days * 16
  const maxNodes = days * 32
  const totalNodes = clamp(
    Math.round(estimatedMoves * days * density),
    minNodes,
    maxNodes,
  )

  const zoneMap = buildZoneMap(totalNodes)
  const mainPath: string[] = []
  const nodes: BoardNode[] = []
  const edges: BoardEdge[] = []

  const nodeSpacing = 32
  const segmentMin = 2
  const segmentMax = 4
  const baseAngle = -Math.PI / 2
  const maxTurn = 1.55
  const edgeWidth = 320
  const edgePullStrength = 0.14
  const microTurn = 0.18
  const swayMultiplier = 1.55
  const backtrackChance = 0.22
  const zoneTargets = new Map<string, number>()
  const specialRanges: Array<{ start: number; end: number }> = []
  const zoneMeta = new Map<
    string,
    {
      start: number
      end: number
      length: number
      waveAmplitude: number
      waveCycles: number
      wavePhase: number
    }
  >()

  let previousTarget = (rng() < 0.5 ? -1 : 1) * edgeWidth * 0.45
  zones.forEach((zone, idx) => {
    if (idx === 0) {
      zoneTargets.set(
        zone.id,
        clamp(previousTarget, -edgeWidth * 0.8, edgeWidth * 0.8),
      )
      return
    }

    const shouldFlip = rng() < 0.82
    const sign = shouldFlip
      ? -Math.sign(previousTarget || 1)
      : Math.sign(previousTarget || 1)
    const magnitude =
      edgeWidth * (idx < 2 ? 0.55 : 0.5 + rng() * 0.35)
    const jitter = (rng() - 0.5) * edgeWidth * 0.15
    const target = clamp(
      sign * magnitude + jitter,
      -edgeWidth * 0.8,
      edgeWidth * 0.8,
    )
    zoneTargets.set(zone.id, target)
    previousTarget = target
  })

  const zoneRanges: Array<{ id: string; start: number; end: number }> = []
  let currentZone = zoneMap.get(0) ?? zones[0]
  let rangeStart = 0
  for (let i = 1; i < totalNodes; i += 1) {
    const zone = zoneMap.get(i) ?? zones[0]
    if (zone.id !== currentZone.id) {
      zoneRanges.push({ id: currentZone.id, start: rangeStart, end: i - 1 })
      currentZone = zone
      rangeStart = i
    }
  }
  zoneRanges.push({
    id: currentZone.id,
    start: rangeStart,
    end: totalNodes - 1,
  })

  zoneRanges.forEach((range, idx) => {
    const length = Math.max(1, range.end - range.start)
    const isEarly = idx < 2
    const waveAmplitude =
      edgeWidth * (isEarly ? 0.36 : 0.26) * (0.85 + rng() * 0.8)
    const waveCycles = (isEarly ? 1.8 : 1.4) + rng() * 1.8
    const wavePhase = rng() * Math.PI * 2
    zoneMeta.set(range.id, {
      start: range.start,
      end: range.end,
      length,
      waveAmplitude,
      waveCycles,
      wavePhase,
    })
  })

  let segmentLength = randomInt(rng, segmentMin, segmentMax)
  let segmentStart = 0
  let segmentStartOffset = 0
  let segmentTargetOffset = (rng() - 0.5) * maxTurn * 2
  let heading = baseAngle
  let x = 0
  let y = 0
  let mode: 'normal' | 'loop' | 'backtrack' = 'normal'
  let modeSteps = 0
  let modeIndex = 0
  let backtrackTarget = baseAngle
  let specialCooldown = 0
  const getZoneTargetX = (index: number) => {
    const zone = zoneMap.get(index) ?? zones[0]
    const baseTarget = zoneTargets.get(zone.id) ?? 0
    const meta = zoneMeta.get(zone.id)
    if (!meta) return baseTarget
    const progress = clamp((index - meta.start) / meta.length, 0, 1)
    const wave =
      Math.sin(progress * Math.PI * 2 * meta.waveCycles + meta.wavePhase) *
      meta.waveAmplitude
    return baseTarget + wave
  }
  const pushSpecialRange = (start: number, end: number) => {
    specialRanges.push({
      start: Math.max(0, start),
      end: Math.min(totalNodes - 1, end),
    })
  }
  const minClearance = nodeSpacing * 1.7
  const minClearanceSq = minClearance * minClearance
  const distToSegmentSq = (
    point: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const abx = b.x - a.x
    const aby = b.y - a.y
    const apx = point.x - a.x
    const apy = point.y - a.y
    const denom = abx * abx + aby * aby
    if (denom === 0) return apx * apx + apy * apy
    const t = clamp((apx * abx + apy * aby) / denom, 0, 1)
    const cx = a.x + abx * t
    const cy = a.y + aby * t
    const dx = point.x - cx
    const dy = point.y - cy
    return dx * dx + dy * dy
  }
  const isTooCloseToPath = (
    existing: Array<{ x: number; y: number }>,
    samples: Array<{ x: number; y: number }>,
    skipTail = 10,
  ) => {
    const limit = Math.max(0, existing.length - skipTail)
    if (limit === 0) return false
    for (const sample of samples) {
      for (let i = 0; i < limit - 1; i += 1) {
        const a = existing[i]
        const b = existing[i + 1]
        if (distToSegmentSq(sample, a, b) < minClearanceSq) {
          return true
        }
      }
    }
    return false
  }

  const rawPoints: Array<{ x: number; y: number }> = []

  for (let index = 0; index < totalNodes; index += 1) {
    if (specialCooldown > 0) {
      specialCooldown -= 1
    }

    if (
      mode === 'normal' &&
      specialCooldown === 0 &&
      index > 6 &&
      index < totalNodes - 12
    ) {
      const roll = rng()
      if (roll < backtrackChance) {
        mode = 'backtrack'
        modeSteps = randomInt(rng, 4, 8)
        modeIndex = 0
        const turn = Math.PI * (0.65 + rng() * 0.2)
        backtrackTarget = baseAngle + (rng() < 0.5 ? turn : -turn)
        pushSpecialRange(index, index + modeSteps + 1)
      }
    }

    if (mode === 'backtrack') {
      const targetX = getZoneTargetX(index)
      const pull =
        clamp((targetX - x) / edgeWidth, -1, 1) * edgePullStrength
      heading += (backtrackTarget - heading) * 0.28
      heading += pull + (rng() - 0.5) * microTurn
      x += Math.cos(heading) * nodeSpacing
      y += Math.sin(heading) * nodeSpacing
      modeIndex += 1

      if (modeIndex >= modeSteps) {
        mode = 'normal'
        specialCooldown = randomInt(rng, 6, 12)
      }

      rawPoints.push({ x, y })
      continue
    }

    if (index === segmentStart + segmentLength) {
      segmentStart = index
      segmentStartOffset = segmentTargetOffset
      segmentTargetOffset = (rng() - 0.5) * maxTurn * 2
      segmentLength = randomInt(rng, segmentMin, segmentMax)
    }

    const t = segmentLength
      ? (index - segmentStart) / segmentLength
      : 1
    const eased = easeInOut(clamp(t, 0, 1))
    const desiredOffset =
      (segmentStartOffset + (segmentTargetOffset - segmentStartOffset) * eased) *
      swayMultiplier
    const desiredAngle = baseAngle + desiredOffset
    const targetX = getZoneTargetX(index)
    const pull =
      clamp((targetX - x) / edgeWidth, -1, 1) * edgePullStrength

    heading += (desiredAngle - heading) * 0.22
    heading += pull + (rng() - 0.5) * microTurn
    heading = clamp(heading, baseAngle - maxTurn, baseAngle + maxTurn)

    x += Math.cos(heading) * nodeSpacing
    y += Math.sin(heading) * nodeSpacing
    rawPoints.push({ x, y })
  }

  const smoothedPoints = smoothPoints(rawPoints, 1)

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
    if (roll < 0.09) {
      node.type = 'bonus'
    } else if (roll < 0.18) {
      node.type = 'challenge'
    }
  })

  for (let i = 0; i < totalNodes - 1; i += 1) {
    edges.push({
      from: mainPath[i],
      to: mainPath[i + 1],
      type: 'main',
      label: 'Trilha principal',
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
