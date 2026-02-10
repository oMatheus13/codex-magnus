import type { SolarisCounts } from '../services/solaris'
import { diceCatalog, type DiceItem } from '../data/dice'
import { getPriceMultiplier } from './pricing'

export type SolarisSplit = SolarisCounts

export type DiceEstimate = {
  id: DiceItem['id']
  faces: number
  cost: number
  currency: DiceItem['currency']
  expectedRoll: number
  expectedDicePerDay: number
  expectedMovesPerDay: number
}

export type ProgressionEstimate = {
  estimatedDailySolaris: SolarisCounts
  priceMultiplier: number
  movesPerDay: number
  movesPerWeek: number
  movesPerTwoWeeks: number
  dice: DiceEstimate[]
}

type EstimateInput = {
  estimatedDailyPoints: number
  split?: SolarisSplit
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const defaultSplit: SolarisSplit = {
  morning: 0.34,
  afternoon: 0.33,
  night: 0.33,
}

const normalizeSplit = (split: SolarisSplit): SolarisSplit => {
  const total = split.morning + split.afternoon + split.night
  if (total <= 0) return { ...defaultSplit }
  return {
    morning: split.morning / total,
    afternoon: split.afternoon / total,
    night: split.night / total,
  }
}

const parseBonusValue = (label: string) => {
  const match = label.match(/([+-]?\d+)/)
  if (!match) return 0
  return Number.parseInt(match[1], 10)
}

const estimateDiceRoll = (dice: DiceItem) => {
  const baseAverage = (dice.faces + 1) / 2
  const bonusValues = dice.bonus
    .map((label) => parseBonusValue(label))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (!bonusValues.length) return baseAverage

  const bonusCount = bonusValues.length
  const bonusAverage =
    bonusValues.reduce((sum, value) => sum + value, 0) / bonusCount
  const bonusChance = bonusCount / (dice.faces + bonusCount)
  return baseAverage + bonusAverage * bonusChance
}

export const estimateDailyMoves = ({
  estimatedDailyPoints,
  split,
}: EstimateInput): ProgressionEstimate => {
  const normalized = normalizeSplit(split ?? defaultSplit)
  const estimatedDailySolaris: SolarisCounts = {
    morning: estimatedDailyPoints * normalized.morning,
    afternoon: estimatedDailyPoints * normalized.afternoon,
    night: estimatedDailyPoints * normalized.night,
  }

  const priceMultiplier = getPriceMultiplier(estimatedDailyPoints)
  const dice = diceCatalog.map((item) => {
    const cost = Math.max(1, Math.round(item.baseCost * priceMultiplier))
    const expectedRoll = estimateDiceRoll(item)
    const expectedDicePerDay = estimatedDailySolaris[item.currency] / cost
    const expectedMovesPerDay = expectedDicePerDay * expectedRoll

    return {
      id: item.id,
      faces: item.faces,
      cost,
      currency: item.currency,
      expectedRoll,
      expectedDicePerDay,
      expectedMovesPerDay,
    }
  })

  const movesPerDay = dice.reduce(
    (sum, entry) => sum + entry.expectedMovesPerDay,
    0,
  )
  const movesPerWeek = movesPerDay * 7
  const movesPerTwoWeeks = movesPerDay * 14

  return {
    estimatedDailySolaris,
    priceMultiplier,
    movesPerDay: clamp(movesPerDay, 0, Number.MAX_SAFE_INTEGER),
    movesPerWeek: clamp(movesPerWeek, 0, Number.MAX_SAFE_INTEGER),
    movesPerTwoWeeks: clamp(movesPerTwoWeeks, 0, Number.MAX_SAFE_INTEGER),
    dice,
  }
}
