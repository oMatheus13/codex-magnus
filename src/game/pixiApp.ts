import {
  Application,
  BLEND_MODES,
  BlurFilter,
  Container,
  Graphics,
} from 'pixi.js'
import { createBoard } from './boardRenderer'
import { createPawn } from './pawn'
import { calculateHabitPointsStats } from '../core/habitStats'
import { oficinaHabits } from '../data/oficina'
import { estimateDailyMoves } from '../core/progression'
import { applyCamera, createCameraState, panCamera, zoomAtPoint } from './camera'
import { attachPanHandlers } from './input'
import { lerp, tween } from './animations'
import type { BoardEdge, BoardNode } from './boardGenerator'
import {
  getBoardState,
  setBoardState,
  updateBoardState,
} from '../services/boardState'

export type PixiHandle = {
  app: Application
  destroy: () => void
  moveSteps: (steps: number) => void
  choosePath: (edgeId: string) => void
  centerOnPawn: () => void
}

export type ChoiceOption = {
  id: string
  label: string
  type: BoardEdge['type']
  toNodeId: string
}

export type MoveState = {
  moving: boolean
  awaitingChoice: boolean
}

type PixiOptions = {
  onChoice?: (options: ChoiceOption[]) => void
  onStateChange?: (state: MoveState) => void
  onEncounter?: (payload: {
    node: BoardNode
    totalNodes: number
    seed: number
  }) => void
}

const edgeLabels: Record<BoardEdge['type'], string> = {
  main: 'Trilha principal',
  branch: 'Caminho alternativo',
}

export function createPixiApp(
  host: HTMLDivElement,
  options: PixiOptions = {},
): PixiHandle {
  const app = new Application({
    resizeTo: host,
    backgroundColor: 0x0b0b13,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(3, window.devicePixelRatio || 1),
  })

  host.appendChild(app.view as HTMLCanvasElement)

  const world = new Container()
  app.stage.addChild(world)

  const scanlineLayer = new Container()
  const scanlines = new Graphics()
  scanlineLayer.addChild(scanlines)
  app.stage.addChild(scanlineLayer)

  const habitStats = calculateHabitPointsStats(oficinaHabits)
  const progress = estimateDailyMoves({
    estimatedDailyPoints: habitStats.estimatedDailyPoints,
  })

  const storedBoard = getBoardState()
  const boardConfig = {
    days: storedBoard?.days ?? 14,
    estimatedDailyMoves: storedBoard?.estimatedDailyMoves ?? progress.movesPerDay,
    seed: storedBoard?.seed ?? Math.floor(Math.random() * 1_000_000),
  }

  const board = createBoard(boardConfig)
  world.addChild(board.container)
  const zoomFilters = [...board.zoomFilters]

  const highlight = new Container()
  const highlightGlow = new Graphics()
  highlightGlow.beginFill(0x2bffd1, 0.22)
  highlightGlow.drawRoundedRect(-12, -12, 24, 24, 6)
  highlightGlow.endFill()
  const highlightBlur = new BlurFilter(28, 2)
  zoomFilters.push({ filter: highlightBlur, baseBlur: 28 })
  highlightGlow.filters = [highlightBlur]
  highlightGlow.blendMode = BLEND_MODES.ADD

  const highlightCore = new Graphics()
  highlightCore.beginFill(0x2bffd1, 0.04)
  highlightCore.drawRoundedRect(-10, -10, 20, 20, 5)
  highlightCore.endFill()
  highlightCore.blendMode = BLEND_MODES.ADD

  highlight.addChild(highlightGlow)
  highlight.addChild(highlightCore)
  highlight.alpha = 1
  world.addChild(highlight)

  const camera = createCameraState()
  let lastZoom = camera.zoom
  const updateZoomFilters = () => {
    const zoom = camera.zoom
    zoomFilters.forEach(({ filter, baseBlur }) => {
      filter.blur = baseBlur * zoom
    })
  }

  const redrawScanlines = () => {
    const width = app.renderer.width
    const height = app.renderer.height
    scanlines.clear()
    scanlines.beginFill(0x05070f, 0.08)
    for (let y = 0; y < height; y += 4) {
      scanlines.drawRect(0, y, width, 1)
    }
    scanlines.endFill()
  }

  redrawScanlines()
  app.renderer.on('resize', redrawScanlines)

  const pawn = createPawn()
  const startNodeId =
    storedBoard?.currentNodeId ??
    board.graph.mainPath[0] ??
    board.graph.nodes[0]?.id ??
    'start'
  const startNode = board.graph.nodes.find((node) => node.id === startNodeId)
  const resolvedNodeId =
    startNode?.id ?? board.graph.mainPath[0] ?? 'start'
  const pawnBase = {
    x: startNode?.x ?? 0,
    y: startNode?.y ?? 0,
  }
  pawn.position.set(pawnBase.x, pawnBase.y)
  world.addChild(pawn)
  camera.x = app.renderer.width / 2 - pawnBase.x * camera.zoom
  camera.y = app.renderer.height / 2 - pawnBase.y * camera.zoom
  applyCamera(world, camera)
  updateZoomFilters()

  if (
    !storedBoard ||
    storedBoard.seed !== boardConfig.seed ||
    storedBoard.days !== boardConfig.days ||
    storedBoard.estimatedDailyMoves !== boardConfig.estimatedDailyMoves ||
    storedBoard.currentNodeId !== resolvedNodeId
  ) {
    setBoardState({
      seed: boardConfig.seed,
      days: boardConfig.days,
      estimatedDailyMoves: boardConfig.estimatedDailyMoves,
      currentNodeId: resolvedNodeId,
      updatedAt: new Date().toISOString(),
    })
  }

  const nodeMap = new Map(board.graph.nodes.map((node) => [node.id, node]))
  const mainNodes = board.graph.mainPath
    .map((id) => nodeMap.get(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
  const angleMap = new Map<string, number>()
  mainNodes.forEach((node, index) => {
    const prev = mainNodes[Math.max(0, index - 1)]
    const next = mainNodes[Math.min(mainNodes.length - 1, index + 1)]
    const dx = (next?.x ?? node.x) - (prev?.x ?? node.x)
    const dy = (next?.y ?? node.y) - (prev?.y ?? node.y)
    angleMap.set(node.id, Math.atan2(dy, dx))
  })
  const edgeMap = new Map<string, BoardEdge>()
  const outgoing = new Map<string, BoardEdge[]>()
  board.graph.edges.forEach((edge) => {
    const id = `${edge.from}->${edge.to}`
    edgeMap.set(id, edge)
    const list = outgoing.get(edge.from) ?? []
    list.push(edge)
    outgoing.set(edge.from, list)
  })

  let currentNodeId = startNode?.id ?? startNodeId
  let highlightAlpha = 1
  let highlightTarget = 1
  let highlightNodeId = currentNodeId
  let remainingSteps = 0
  let moving = false
  let awaitingChoice = false
  let pendingChoices: ChoiceOption[] = []
  let cancelMove: (() => void) | null = null
  let followPawn = true

  const centerOnPawn = () => {
    followPawn = true
    camera.x = app.renderer.width / 2 - pawnBase.x * camera.zoom
    camera.y = app.renderer.height / 2 - pawnBase.y * camera.zoom
  }

  const notifyState = () => {
    options.onStateChange?.({ moving, awaitingChoice })
  }

  const clearChoices = () => {
    pendingChoices = []
    awaitingChoice = false
    options.onChoice?.([])
    notifyState()
  }

  const triggerEncounter = (node: BoardNode) => {
    options.onEncounter?.({
      node,
      totalNodes: board.graph.nodes.length,
      seed: boardConfig.seed,
    })
  }

  const moveAlongEdge = (edge: BoardEdge) => {
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) {
      moving = false
      notifyState()
      return
    }

    highlightTarget = 0
    const duration = 420
    cancelMove?.()
    cancelMove = tween(duration, (t) => {
      pawnBase.x = lerp(fromNode.x, toNode.x, t)
      pawnBase.y = lerp(fromNode.y, toNode.y, t)
    }, () => {
      currentNodeId = edge.to
      highlightNodeId = currentNodeId
      updateBoardState({ currentNodeId })
      remainingSteps = Math.max(0, remainingSteps - 1)
      const nextNode = nodeMap.get(currentNodeId)
      if (
        remainingSteps <= 0 &&
        nextNode &&
        (nextNode.type === 'bonus' || nextNode.type === 'challenge')
      ) {
        highlightTarget = 1
        highlightNodeId = currentNodeId
        triggerEncounter(nextNode)
        moving = false
        notifyState()
        return
      }
      stepForward()
    })
  }

  const stepForward = () => {
    if (remainingSteps <= 0) {
      moving = false
      highlightTarget = 1
      highlightNodeId = currentNodeId
      notifyState()
      return
    }

    const edges = outgoing.get(currentNodeId) ?? []
    if (edges.length === 0) {
      moving = false
      notifyState()
      return
    }

    if (edges.length > 1) {
      pendingChoices = edges.map((edge) => ({
        id: `${edge.from}->${edge.to}`,
        label: edge.label ?? edgeLabels[edge.type],
        type: edge.type,
        toNodeId: edge.to,
      }))
      awaitingChoice = true
      options.onChoice?.(pendingChoices)
      highlightTarget = 1
      highlightNodeId = currentNodeId
      notifyState()
      return
    }

    moveAlongEdge(edges[0])
  }

  const moveSteps = (steps: number) => {
    if (!steps || steps <= 0) return
    if (moving || awaitingChoice) return
    remainingSteps = steps
    moving = true
    notifyState()
    stepForward()
  }

  const choosePath = (edgeId: string) => {
    if (!awaitingChoice) return
    const edge = edgeMap.get(edgeId)
    if (!edge) return
    clearChoices()
    moveAlongEdge(edge)
  }

  host.style.touchAction = 'none'
  const detachPan = attachPanHandlers(
    host,
    (dx, dy) => {
      followPawn = false
      panCamera(camera, dx, dy)
    },
    {
      shouldStart: (event) => event.button === 1 || event.button === 2,
    },
  )

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    followPawn = false
    const rect = host.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const delta = event.deltaY < 0 ? 0.12 : -0.12
    zoomAtPoint(camera, x, y, delta)
  }

  const preventContext = (event: MouseEvent) => {
    event.preventDefault()
  }

  host.addEventListener('wheel', onWheel, { passive: false })
  host.addEventListener('contextmenu', preventContext)

  app.ticker.add(() => {
    if (followPawn) {
      const targetX = app.renderer.width / 2 - pawnBase.x * camera.zoom
      const targetY = app.renderer.height / 2 - pawnBase.y * camera.zoom
      camera.x = lerp(camera.x, targetX, 0.12)
      camera.y = lerp(camera.y, targetY, 0.12)
    }
    if (Math.abs(camera.zoom - lastZoom) > 0.001) {
      lastZoom = camera.zoom
      updateZoomFilters()
    }
    applyCamera(world, camera)
    pawn.position.set(
      pawnBase.x,
      pawnBase.y + Math.sin(performance.now() / 250) * 2,
    )
    const highlightLerp = highlightTarget === 0 ? 0.28 : 0.16
    highlightAlpha = lerp(highlightAlpha, highlightTarget, highlightLerp)
    highlight.alpha = highlightAlpha
    const highlightScale = 0.96 + highlightAlpha * 0.08
    highlight.scale.set(highlightScale)
    const currentNode = nodeMap.get(highlightNodeId)
    if (currentNode) {
      highlight.position.set(currentNode.x, currentNode.y)
      highlight.rotation = angleMap.get(currentNodeId) ?? 0
    }

    const time = performance.now() / 1000
    board.ambientParticles.forEach((particle) => {
      particle.graphic.x =
        particle.baseX + Math.sin(time * particle.speed + particle.phase) * particle.driftX
      particle.graphic.y =
        particle.baseY + Math.cos(time * particle.speed + particle.phase) * particle.driftY
      particle.graphic.alpha = 0.25 + Math.sin(time * 0.6 + particle.phase) * 0.12
    })
  })

  return {
    app,
    destroy: () => {
      cancelMove?.()
      detachPan()
      host.removeEventListener('wheel', onWheel)
      host.removeEventListener('contextmenu', preventContext)
      app.renderer.off('resize', redrawScanlines)
      app.destroy(true)
      host.textContent = ''
    },
    moveSteps,
    choosePath,
    centerOnPawn,
  }
}
