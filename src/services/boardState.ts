export type BoardState = {
  seed: number
  days: number
  estimatedDailyMoves: number
  currentNodeId: string
  updatedAt: string
}

const STORAGE_KEY = 'codex-board-state'
const BOARD_EVENT = 'codex-board-change'

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const readState = (): BoardState | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<BoardState>
    if (
      !isValidNumber(parsed.seed) ||
      !isValidNumber(parsed.days) ||
      !isValidNumber(parsed.estimatedDailyMoves) ||
      typeof parsed.currentNodeId !== 'string' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null
    }
    return {
      seed: parsed.seed,
      days: parsed.days,
      estimatedDailyMoves: parsed.estimatedDailyMoves,
      currentNodeId: parsed.currentNodeId,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

const writeState = (state: BoardState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(BOARD_EVENT))
}

export const getBoardState = (): BoardState | null => readState()

export const setBoardState = (state: BoardState) => {
  writeState(state)
}

export const clearBoardState = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(BOARD_EVENT))
}

export const updateBoardState = (patch: Partial<BoardState>) => {
  const current = readState()
  const next: BoardState = {
    seed: patch.seed ?? current?.seed ?? 0,
    days: patch.days ?? current?.days ?? 0,
    estimatedDailyMoves:
      patch.estimatedDailyMoves ?? current?.estimatedDailyMoves ?? 0,
    currentNodeId: patch.currentNodeId ?? current?.currentNodeId ?? 'start',
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  }
  writeState(next)
  return next
}

export const subscribeBoardState = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler()
  }
  window.addEventListener(BOARD_EVENT, onEvent)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(BOARD_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
