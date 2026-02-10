const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const getPriceMultiplier = (
  estimatedDailyPoints: number,
  baseline = 18,
) => {
  if (!estimatedDailyPoints || estimatedDailyPoints <= 0) return 1
  const ratio = estimatedDailyPoints / baseline
  return clamp(ratio, 0.8, 1.4)
}
