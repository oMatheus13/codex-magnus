export type Goal = {
  id: string
  habitId: string
  habitLabel: string
  targetDays: number
  createdAt: string
  completedDates: string[]
}

const STORAGE_KEY = 'codex-goals-store'
const GOALS_EVENT = 'codex-goals-change'

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeDates = (dates: string[]) => {
  const unique = Array.from(new Set(dates.filter(Boolean)))
  unique.sort()
  return unique
}

const readGoals = (): Goal[] => {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Goal[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((goal) => {
        if (
          !goal ||
          typeof goal.id !== 'string' ||
          typeof goal.habitId !== 'string' ||
          typeof goal.habitLabel !== 'string' ||
          typeof goal.targetDays !== 'number' ||
          typeof goal.createdAt !== 'string' ||
          !Array.isArray(goal.completedDates)
        ) {
          return null
        }
        return {
          ...goal,
          targetDays: Math.max(1, Math.floor(goal.targetDays)),
          completedDates: normalizeDates(goal.completedDates),
        }
      })
      .filter((goal): goal is Goal => Boolean(goal))
  } catch {
    return []
  }
}

const writeGoals = (goals: Goal[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  window.dispatchEvent(new Event(GOALS_EVENT))
}

export const getGoals = (): Goal[] => readGoals()

export const addGoal = (input: {
  habitId: string
  habitLabel: string
  targetDays: number
}) => {
  const goals = readGoals()
  const next: Goal = {
    id: createId(),
    habitId: input.habitId,
    habitLabel: input.habitLabel,
    targetDays: Math.max(1, Math.floor(input.targetDays)),
    createdAt: new Date().toISOString(),
    completedDates: [],
  }
  const updated = [next, ...goals]
  writeGoals(updated)
  return updated
}

export const toggleGoalDay = (goalId: string, dateKey: string) => {
  const goals = readGoals()
  const updated = goals.map((goal) => {
    if (goal.id !== goalId) return goal
    const set = new Set(goal.completedDates)
    if (set.has(dateKey)) {
      set.delete(dateKey)
    } else {
      set.add(dateKey)
    }
    return {
      ...goal,
      completedDates: normalizeDates(Array.from(set)),
    }
  })
  writeGoals(updated)
  return updated
}

export const removeGoal = (goalId: string) => {
  const goals = readGoals()
  const updated = goals.filter((goal) => goal.id !== goalId)
  writeGoals(updated)
  return updated
}

export const subscribeGoals = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler()
  }
  window.addEventListener(GOALS_EVENT, onEvent)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(GOALS_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
