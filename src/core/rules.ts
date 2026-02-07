export type TurnId = 'morning' | 'afternoon' | 'night'

export type Habit = {
  id: string
  label: string
  points: number
  completed: boolean
}

export function scoreHabits(habits: Habit[]) {
  return habits.reduce(
    (total, habit) => total + (habit.completed ? habit.points : 0),
    0,
  )
}

export function advancePosition(
  current: number,
  steps: number,
  trackSize: number,
) {
  if (trackSize <= 0) return 0
  const next = (current + steps) % trackSize
  return next < 0 ? next + trackSize : next
}
