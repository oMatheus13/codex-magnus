import { Application, Container } from 'pixi.js'
import { createBoard } from './boardRenderer'
import { createPawn } from './pawn'
import { calculateHabitPointsStats } from '../core/habitStats'
import { oficinaHabits } from '../data/oficina'
import { estimateDailyMoves } from '../core/progression'
import { applyCamera, createCameraState, panCamera, zoomAtPoint } from './camera'
import { attachPanHandlers } from './input'
import { lerp, tween } from './animations'
import type { BoardEdge } from './boardGenerator'
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
    antialias: false,
    autoDensity: true,
  })

  host.appendChild(app.view as HTMLCanvasElement)

  const world = new Container()
  app.stage.addChild(world)

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

  const camera = createCameraState()

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

  const moveAlongEdge = (edge: BoardEdge) => {
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) {
      moving = false
      notifyState()
      return
    }

    const duration = 420
    cancelMove?.()
    cancelMove = tween(duration, (t) => {
      pawnBase.x = lerp(fromNode.x, toNode.x, t)
      pawnBase.y = lerp(fromNode.y, toNode.y, t)
    }, () => {
      currentNodeId = edge.to
      updateBoardState({ currentNodeId })
      remainingSteps = Math.max(0, remainingSteps - 1)
      stepForward()
    })
  }

  const stepForward = () => {
    if (remainingSteps <= 0) {
      moving = false
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
    applyCamera(world, camera)
    pawn.position.set(
      pawnBase.x,
      pawnBase.y + Math.sin(performance.now() / 250) * 2,
    )
  })

  return {
    app,
    destroy: () => {
      cancelMove?.()
      detachPan()
      host.removeEventListener('wheel', onWheel)
      host.removeEventListener('contextmenu', preventContext)
      app.destroy(true)
      host.textContent = ''
    },
    moveSteps,
    choosePath,
    centerOnPawn,
  }
}
