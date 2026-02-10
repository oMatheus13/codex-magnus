import type { HabitFrequency, HabitItem } from '../data/oficina'

export type HabitPointsStats = {
  totals: Record<HabitFrequency, number>
  totalPoints: number
  estimatedDailyPoints: number
  estimatedDailyPercent: number
}

const frequencyOrder: HabitFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
]

const frequencyDivisor: Record<HabitFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
}

const clampPercent = (value: number) =>
  Math.max(0, Math.min(100, value))

export const calculateHabitPointsStats = (
  habits: HabitItem[],
): HabitPointsStats => {
  const totals: Record<HabitFrequency, number> = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    quarterly: 0,
  }

  habits.forEach((habit) => {
    totals[habit.frequency] += habit.points
  })

  const totalPoints = frequencyOrder.reduce(
    (acc, freq) => acc + totals[freq],
    0,
  )

  const estimatedDailyPoints = frequencyOrder.reduce((acc, freq) => {
    return acc + totals[freq] / frequencyDivisor[freq]
  }, 0)

  const estimatedDailyPercent = totalPoints
    ? clampPercent((estimatedDailyPoints / totalPoints) * 100)
    : 0

  return {
    totals,
    totalPoints,
    estimatedDailyPoints,
    estimatedDailyPercent,
  }
}
