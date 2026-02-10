import type { User } from '@supabase/supabase-js'

export type DevUser = Pick<User, 'id' | 'email' | 'created_at' | 'user_metadata'>

const DEV_SESSION_KEY = 'codex-dev-session'
const DEV_SESSION_EVENT = 'codex-dev-session-change'

const isDevEnv = () => import.meta.env.DEV

const buildDevUser = (overrides?: Partial<DevUser>): DevUser => {
  const now = new Date().toISOString()

  return {
    id: 'dev-local-user',
    email: 'dev@codex.local',
    created_at: now,
    ...overrides,
    user_metadata: {
      display_name: 'Dev',
      username: 'dev',
      is_dev: true,
      ...(overrides?.user_metadata ?? {}),
    },
  }
}

const emitDevSession = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DEV_SESSION_EVENT))
}

export const getDevUser = (): DevUser | null => {
  if (!isDevEnv() || typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(DEV_SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as DevUser
  } catch {
    return null
  }
}

export const setDevUser = (overrides?: Partial<DevUser>) => {
  if (!isDevEnv() || typeof window === 'undefined') return null
  const user = buildDevUser(overrides)
  window.localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(user))
  emitDevSession()
  return user
}

export const updateDevUser = (patch: Partial<DevUser>) => {
  if (!isDevEnv() || typeof window === 'undefined') return null
  const current = getDevUser()
  if (!current) return null

  const next: DevUser = {
    ...current,
    ...patch,
    user_metadata: {
      ...(current.user_metadata ?? {}),
      ...(patch.user_metadata ?? {}),
    },
  }

  window.localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(next))
  emitDevSession()
  return next
}

export const clearDevUser = () => {
  if (!isDevEnv() || typeof window === 'undefined') return
  window.localStorage.removeItem(DEV_SESSION_KEY)
  emitDevSession()
}

export const subscribeDevSession = (handler: () => void) => {
  if (!isDevEnv() || typeof window === 'undefined') return () => {}

  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEV_SESSION_KEY) {
      handler()
    }
  }

  window.addEventListener(DEV_SESSION_EVENT, onEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(DEV_SESSION_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
