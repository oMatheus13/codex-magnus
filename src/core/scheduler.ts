import type { TurnId } from './rules'

export function getDayKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getCurrentTurn(date: Date = new Date()): TurnId {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'night'
}
