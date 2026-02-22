import type { DiceVariant } from '../data/dice'

export type DiceInventory = Record<DiceVariant, number>

const STORAGE_KEY = 'codex-dice-inventory'
const DICE_EVENT = 'codex-dice-change'

const emptyInventory: DiceInventory = {
  aurora: 0,
  vesper: 0,
  noctis: 0,
}

const readStore = (): DiceInventory => {
  if (typeof window === 'undefined') return { ...emptyInventory }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...emptyInventory }
  try {
    const parsed = JSON.parse(raw) as Partial<DiceInventory>
    return {
      aurora: parsed.aurora ?? 0,
      vesper: parsed.vesper ?? 0,
      noctis: parsed.noctis ?? 0,
    }
  } catch {
    return { ...emptyInventory }
  }
}

const writeStore = (store: DiceInventory) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event(DICE_EVENT))
}

export const getDiceInventory = (): DiceInventory => readStore()

export const setDiceInventory = (inventory: DiceInventory) => {
  writeStore({
    aurora: Math.max(0, inventory.aurora ?? 0),
    vesper: Math.max(0, inventory.vesper ?? 0),
    noctis: Math.max(0, inventory.noctis ?? 0),
  })
}

export const resetDiceInventory = () => {
  writeStore({ ...emptyInventory })
}

export const addDice = (variant: DiceVariant, amount = 1) => {
  const store = readStore()
  store[variant] = Math.max(0, (store[variant] ?? 0) + amount)
  writeStore(store)
  return store
}

export const consumeDice = (variant: DiceVariant, amount = 1) => {
  const store = readStore()
  const current = store[variant] ?? 0
  if (current < amount) return false
  store[variant] = Math.max(0, current - amount)
  writeStore(store)
  return true
}

export const subscribeDiceInventory = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler()
  }

  window.addEventListener(DICE_EVENT, onEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(DICE_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
