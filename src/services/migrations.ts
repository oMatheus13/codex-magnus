import type { AppState } from './db'

export const SCHEMA_VERSION = 1

export function migrateState(state: AppState): AppState {
  if (state.version === SCHEMA_VERSION) return state
  return {
    ...state,
    version: SCHEMA_VERSION,
  }
}
