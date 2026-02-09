export type AppState = {
  version: number
  pawnPosition: number
  lastDayKey: string
}

const STORAGE_KEY = 'codexmagnus:state'

export function loadState(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppState
  } catch {
    return null
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
