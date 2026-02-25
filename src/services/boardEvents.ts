import type { DiceVariant } from '../data/dice'
import type { BoardNode } from '../game/boardGenerator'
import type { SolarisType } from './solaris'
import { addDice } from './diceInventory'
import { adjustSolarisWallet } from './solaris'

export type BoardEventType = 'bonus' | 'challenge'
export type BoardEventDifficulty =
  | 'Gradus Novitius'
  | 'Gradus Medius'
  | 'Gradus Magnus'
  | 'Gradus Extremus'

type RewardTemplate =
  | {
      type: 'solaris'
      solaris: SolarisType | 'random'
      amount: number | [number, number]
    }
  | {
      type: 'dice'
      dice: DiceVariant | 'random'
      amount: number | [number, number]
    }

type BoardEventTemplate = {
  id: string
  type: BoardEventType
  title: string
  description: string
  reward: RewardTemplate
}

export type BoardReward =
  | { type: 'solaris'; solaris: SolarisType; amount: number }
  | { type: 'dice'; dice: DiceVariant; amount: number }

export type BoardEvent = {
  id: string
  type: BoardEventType
  title: string
  description: string
  difficulty?: BoardEventDifficulty
  reward: BoardReward
}

export type BoardEventLogEntry = {
  key: string
  nodeId: string
  eventId: string
  type: BoardEventType
  status: 'pending' | 'claimed' | 'completed'
  title: string
  description: string
  difficulty?: BoardEventDifficulty
  reward: BoardReward
  updatedAt: string
}

const STORAGE_KEY = 'codex-board-events'
const BOARD_EVENT = 'codex-board-events-change'

const bonusTemplates: BoardEventTemplate[] = [
  {
    id: 'solaris-cache',
    type: 'bonus',
    title: 'Bolsa de Solaris',
    description: 'Um brilho raro no caminho revela alguns Solaris extras.',
    reward: { type: 'solaris', solaris: 'random', amount: [1, 2] },
  },
  {
    id: 'dice-drop',
    type: 'bonus',
    title: 'Dado Recuperado',
    description: 'Voce encontra um dado perdido entre as casas.',
    reward: { type: 'dice', dice: 'random', amount: 1 },
  },
  {
    id: 'signal-boost',
    type: 'bonus',
    title: 'Sinal Amplificado',
    description: 'O tabuleiro vibra e entrega um impulso luminoso.',
    reward: { type: 'solaris', solaris: 'random', amount: [2, 3] },
  },
  {
    id: 'lucky-chime',
    type: 'bonus',
    title: 'Badalada da Sorte',
    description: 'Um som retro confirma um presente rapido.',
    reward: { type: 'dice', dice: 'random', amount: [1, 2] },
  },
]

const challengeTemplates: BoardEventTemplate[] = [
  {
    id: 'focus-sprint',
    type: 'challenge',
    title: 'Sprint de Foco',
    description: 'Escolha uma tarefa e finalize sem interrupcoes.',
    reward: { type: 'solaris', solaris: 'random', amount: [2, 3] },
  },
  {
    id: 'ritual-consistency',
    type: 'challenge',
    title: 'Ritual de Consistencia',
    description: 'Repita um habito essencial sem falhar hoje.',
    reward: { type: 'solaris', solaris: 'random', amount: [3, 4] },
  },
  {
    id: 'tempo-guard',
    type: 'challenge',
    title: 'Guardiao do Tempo',
    description: 'Corte uma distracao e ganhe mais espaco mental.',
    reward: { type: 'dice', dice: 'random', amount: 1 },
  },
  {
    id: 'momentum-test',
    type: 'challenge',
    title: 'Teste de Momentum',
    description: 'Complete algo que voce vem adiando.',
    reward: { type: 'dice', dice: 'random', amount: [1, 2] },
  },
]

const difficulties: BoardEventDifficulty[] = [
  'Gradus Novitius',
  'Gradus Medius',
  'Gradus Magnus',
  'Gradus Extremus',
]

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createRng = (seed: number) => {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(list: T[], rng: () => number) =>
  list[Math.floor(rng() * list.length)] ?? list[0]

const randomInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min

const resolveAmount = (amount: number | [number, number], rng: () => number) =>
  Array.isArray(amount) ? randomInt(rng, amount[0], amount[1]) : amount

const solarisTypes: SolarisType[] = ['morning', 'afternoon', 'night']
const diceVariants: DiceVariant[] = ['aurora', 'vesper', 'noctis']

const resolveReward = (
  template: RewardTemplate,
  rng: () => number,
  difficultyIndex: number,
): BoardReward => {
  if (template.type === 'solaris') {
    const solaris =
      template.solaris === 'random'
        ? pick(solarisTypes, rng)
        : template.solaris
    const amount = resolveAmount(template.amount, rng) + difficultyIndex
    return { type: 'solaris', solaris, amount: Math.max(1, amount) }
  }

  const dice =
    template.dice === 'random' ? pick(diceVariants, rng) : template.dice
  const amount = resolveAmount(template.amount, rng) + Math.floor(difficultyIndex / 2)
  return { type: 'dice', dice, amount: Math.max(1, amount) }
}

const getDifficultyIndex = (nodeIndex: number, totalNodes: number) => {
  if (totalNodes <= 0) return 0
  const progress = nodeIndex / totalNodes
  if (progress < 0.35) return 0
  if (progress < 0.6) return 1
  if (progress < 0.82) return 2
  return 3
}

const readLog = (): Record<string, BoardEventLogEntry> => {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, BoardEventLogEntry>
  } catch {
    return {}
  }
}

const writeLog = (log: Record<string, BoardEventLogEntry>) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  window.dispatchEvent(new Event(BOARD_EVENT))
}

export const getBoardEventKey = (seed: number, nodeId: string) =>
  `${seed}:${nodeId}`

export const getBoardEventStatus = (key: string) =>
  readLog()[key]?.status ?? null

export const isBoardEventResolved = (key: string) => {
  const status = getBoardEventStatus(key)
  return Boolean(status && status !== 'pending')
}

export const getPendingBoardEvents = () => {
  const log = readLog()
  return Object.values(log).filter((entry) => entry.status === 'pending')
}

export const setBoardEventPending = (
  key: string,
  nodeId: string,
  event: BoardEvent,
) => {
  const log = readLog()
  if (log[key]?.status === 'pending') return log[key]
  log[key] = {
    key,
    nodeId,
    eventId: event.id,
    type: event.type,
    status: 'pending',
    title: event.title,
    description: event.description,
    difficulty: event.difficulty,
    reward: event.reward,
    updatedAt: new Date().toISOString(),
  }
  writeLog(log)
  return log[key]
}

export const resolveBoardEvent = (
  key: string,
  nodeId: string,
  event: BoardEvent,
) => {
  const log = readLog()
  log[key] = {
    key,
    nodeId,
    eventId: event.id,
    type: event.type,
    status: event.type === 'bonus' ? 'claimed' : 'completed',
    title: event.title,
    description: event.description,
    difficulty: event.difficulty,
    reward: event.reward,
    updatedAt: new Date().toISOString(),
  }
  writeLog(log)
  return log[key]
}

export const getBoardEventForNode = (
  node: BoardNode,
  totalNodes: number,
  seed: number,
): BoardEvent | null => {
  if (node.type !== 'bonus' && node.type !== 'challenge') return null
  const key = `${seed}:${node.id}:${node.type}`
  const rng = createRng(hashString(key))
  const templatePool =
    node.type === 'bonus' ? bonusTemplates : challengeTemplates
  const template = pick(templatePool, rng)
  const difficultyIndex = getDifficultyIndex(node.index, totalNodes)
  const difficulty =
    node.type === 'challenge' ? difficulties[difficultyIndex] : undefined
  const reward = resolveReward(template.reward, rng, difficultyIndex)

  return {
    id: template.id,
    type: template.type,
    title: template.title,
    description: template.description,
    difficulty,
    reward,
  }
}

export const applyBoardReward = (reward: BoardReward) => {
  if (reward.type === 'solaris') {
    adjustSolarisWallet(reward.solaris, reward.amount)
    return
  }
  addDice(reward.dice, reward.amount)
}

export const clearBoardEvents = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(BOARD_EVENT))
}

export const subscribeBoardEvents = (handler: () => void) => {
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
