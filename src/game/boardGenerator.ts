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
  const segmentMin = 4
  const segmentMax = 7
  const baseAngle = -Math.PI / 2
  const maxTurn = 1.2
  const edgeWidth = 280
  const edgePullStrength = 0.1
  const microTurn = 0.08
  const loopChance = 0.025
  const backtrackChance = 0.12
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

    const shouldFlip = idx === 1 ? true : rng() < 0.7
    const sign = shouldFlip
      ? -Math.sign(previousTarget || 1)
      : Math.sign(previousTarget || 1)
    const magnitude =
      edgeWidth * (idx < 2 ? 0.45 : 0.35 + rng() * 0.25)
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
      edgeWidth * (isEarly ? 0.22 : 0.12) * (0.75 + rng() * 0.6)
    const waveCycles = (isEarly ? 1.1 : 0.7) + rng() * 1.2
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
  let loopCenter = { x: 0, y: 0 }
  let loopAngle = 0
  let loopRadius = 80
  let loopDirection = 1
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
      if (roll < loopChance) {
        const candidateRadius = 70 + rng() * 60
        const minLoopSteps = Math.ceil(
          (Math.PI * 2 * candidateRadius) / nodeSpacing,
        )
        const candidateSteps = Math.max(randomInt(rng, 10, 16), minLoopSteps)
        const candidateDirection = rng() < 0.5 ? 1 : -1
        const candidateCenter = {
          x: x + Math.cos(heading + candidateDirection * Math.PI / 2) * candidateRadius,
          y: y + Math.sin(heading + candidateDirection * Math.PI / 2) * candidateRadius,
        }
        const candidateAngle = Math.atan2(y - candidateCenter.y, x - candidateCenter.x)
        const loopSamples = Array.from({ length: candidateSteps }, (_, step) => {
          const t = (step + 1) / Math.max(1, candidateSteps)
          const angle = candidateAngle + candidateDirection * t * Math.PI * 2
          return {
            x: candidateCenter.x + Math.cos(angle) * candidateRadius,
            y: candidateCenter.y + Math.sin(angle) * candidateRadius,
          }
        })

        if (isTooCloseToPath(rawPoints, loopSamples)) {
          specialCooldown = randomInt(rng, 6, 12)
        } else {
          mode = 'loop'
          loopRadius = candidateRadius
          modeSteps = candidateSteps
          modeIndex = 0
          loopDirection = candidateDirection
          loopCenter = candidateCenter
          loopAngle = candidateAngle
          pushSpecialRange(index, index + modeSteps + 1)
        }
      } else if (roll < loopChance + backtrackChance) {
        mode = 'backtrack'
        modeSteps = randomInt(rng, 4, 8)
        modeIndex = 0
        const turn = Math.PI * (0.65 + rng() * 0.2)
        backtrackTarget = baseAngle + (rng() < 0.5 ? turn : -turn)
        pushSpecialRange(index, index + modeSteps + 1)
      }
    }

    if (mode === 'loop') {
      const t = (modeIndex + 1) / Math.max(1, modeSteps)
      const angle = loopAngle + loopDirection * t * Math.PI * 2
      x = loopCenter.x + Math.cos(angle) * loopRadius
      y = loopCenter.y + Math.sin(angle) * loopRadius
      heading = angle + loopDirection * Math.PI / 2
      modeIndex += 1

      if (modeIndex >= modeSteps) {
        mode = 'normal'
        specialCooldown = randomInt(rng, 6, 12)
      }

      rawPoints.push({ x, y })
      continue
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
      segmentStartOffset + (segmentTargetOffset - segmentStartOffset) * eased
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

  const branchCount = clamp(Math.floor(totalNodes / 80) + 1, 1, 4)
  const usedRanges: Array<{ start: number; end: number }> = []
  const isNearSpecial = (index: number, padding = 6) =>
    specialRanges.some(
      (range) => index >= range.start - padding && index <= range.end + padding,
    )
  const variants: Array<{
    id: 'bonus' | 'challenge' | 'safe'
    label: string
    nodeType: BoardNodeType
  }> = [
    { id: 'bonus', label: 'Caminho bonus', nodeType: 'bonus' },
    {
      id: 'challenge',
      label: 'Caminho desafio',
      nodeType: 'challenge',
    },
    { id: 'safe', label: 'Caminho seguro', nodeType: 'normal' },
  ]
  let branchIndex = totalNodes

  for (let b = 0; b < branchCount; b += 1) {
    let startIndex = randomInt(rng, 8, totalNodes - 18)
    let branchNodes = randomInt(rng, 4, 6)
    let rejoinOffset = branchNodes + randomInt(rng, 4, 8)
    let rejoinIndex = Math.min(totalNodes - 2, startIndex + rejoinOffset)

    let guard = 0
    while (
      (usedRanges.some(
        (range) =>
          startIndex <= range.end + 2 && rejoinIndex >= range.start - 2,
      ) ||
        isNearSpecial(startIndex) ||
        isNearSpecial(rejoinIndex)) &&
      guard < 30
    ) {
      startIndex = randomInt(rng, 8, totalNodes - 18)
      branchNodes = randomInt(rng, 4, 6)
      rejoinOffset = branchNodes + randomInt(rng, 4, 8)
      rejoinIndex = Math.min(totalNodes - 2, startIndex + rejoinOffset)
      guard += 1
    }

    usedRanges.push({ start: startIndex, end: rejoinIndex })

    const startNode = nodes[startIndex]
    const endNode = nodes[rejoinIndex]
    const dx = endNode.x - startNode.x
    const dy = endNode.y - startNode.y
    const dist = Math.hypot(dx, dy) || 1
    const nx = -dy / dist
    const ny = dx / dist
    const baseOffset = 90 + rng() * 50
    const pathCount = rng() < 0.35 ? 2 : 1

    const shuffled = [...variants].sort(() => rng() - 0.5)
    const picked = shuffled.slice(0, pathCount)
    const offsets = pathCount === 2 ? [-1, 1] : [rng() < 0.5 ? -1 : 1]

    picked.forEach((variant, idx) => {
      const side = offsets[idx] ?? 1
      let prevId = startNode.id

      for (let i = 0; i < branchNodes; i += 1) {
        const t = (i + 1) / (branchNodes + 1)
        const curve = Math.sin(Math.PI * t) * baseOffset * side
        const wobble = (rng() - 0.5) * 12
        const x = startNode.x + dx * t + nx * curve + nx * wobble
        const y = startNode.y + dy * t + ny * curve + ny * wobble
        const nodeIndex = branchIndex
        const id = `b-${nodeIndex}`
        branchIndex += 1

        nodes.push({
          id,
          index: nodeIndex,
          x,
          y,
          zoneId: startNode.zoneId,
          type: variant.nodeType,
        })

        edges.push({
          from: prevId,
          to: id,
          type: 'branch',
          label: prevId === startNode.id ? variant.label : undefined,
          branchKind: variant.id,
        })
        prevId = id
      }

      edges.push({ from: prevId, to: endNode.id, type: 'branch' })
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
