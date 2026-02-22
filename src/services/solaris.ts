export type SolarisType = 'morning' | 'afternoon' | 'night'

export type SolarisCounts = Record<SolarisType, number>

export type SolarisHabitEntry = {
  type: SolarisType
  points: number
}

export type SolarisDayData = {
  counts: SolarisCounts
  completed: Record<string, SolarisHabitEntry>
  claimed: Record<string, SolarisHabitEntry>
}

const STORAGE_KEY = 'codex-solaris-store'
const WALLET_KEY = 'codex-solaris-wallet'
const SOLARIS_EVENT = 'codex-solaris-change'

const emptyCounts: SolarisCounts = {
  morning: 0,
  afternoon: 0,
  night: 0,
}

const createDayData = (): SolarisDayData => ({
  counts: { ...emptyCounts },
  completed: {},
  claimed: {},
})

const buildWalletFromStore = (store: Record<string, SolarisDayData>) => {
  const totals = { ...emptyCounts }
  Object.values(store).forEach((day) => {
    const claimed = day?.claimed ?? day?.completed ?? {}
    Object.values(claimed).forEach((entry) => {
      totals[entry.type] += entry.points
    })
  })
  return totals
}

export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readStore = (): Record<string, SolarisDayData> => {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, SolarisDayData>
  } catch {
    return {}
  }
}

const writeStore = (store: Record<string, SolarisDayData>) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  window.dispatchEvent(new Event(SOLARIS_EVENT))
}

const readWallet = (): SolarisCounts => {
  if (typeof window === 'undefined') return { ...emptyCounts }
  const raw = window.localStorage.getItem(WALLET_KEY)
  if (!raw) {
    const store = readStore()
    const totals = { ...emptyCounts }
    Object.values(store).forEach((day) => {
      const claimed = day?.claimed ?? day?.completed ?? {}
      Object.values(claimed).forEach((entry) => {
        totals[entry.type] += entry.points
      })
    })
    window.localStorage.setItem(WALLET_KEY, JSON.stringify(totals))
    return totals
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SolarisCounts>
    return {
      morning: parsed.morning ?? 0,
      afternoon: parsed.afternoon ?? 0,
      night: parsed.night ?? 0,
    }
  } catch {
    return { ...emptyCounts }
  }
}

const writeWallet = (wallet: SolarisCounts) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WALLET_KEY, JSON.stringify(wallet))
  window.dispatchEvent(new Event(SOLARIS_EVENT))
}

export const getSolarisTypeByTime = (date = new Date()): SolarisType => {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

export const getSolarisDay = (dateKey = getDateKey()): SolarisDayData => {
  const store = readStore()
  const data = store[dateKey]
  if (!data) return createDayData()
  const claimed =
    data.claimed ?? (data.completed ? { ...data.completed } : {})
  return {
    counts: {
      morning: data.counts?.morning ?? 0,
      afternoon: data.counts?.afternoon ?? 0,
      night: data.counts?.night ?? 0,
    },
    completed: data.completed ?? {},
    claimed,
  }
}

export const getSolarisCounts = (dateKey = getDateKey()): SolarisCounts =>
  getSolarisDay(dateKey).counts

export const getSolarisWallet = (): SolarisCounts => readWallet()

export const setSolarisWallet = (wallet: SolarisCounts) => {
  writeWallet({
    morning: Math.max(0, wallet.morning ?? 0),
    afternoon: Math.max(0, wallet.afternoon ?? 0),
    night: Math.max(0, wallet.night ?? 0),
  })
}

export const resetSolarisAll = () => {
  writeStore({})
  writeWallet({ ...emptyCounts })
}

export const resetSolarisDay = (dateKey: string) => {
  const store = readStore()
  if (!store[dateKey]) return false
  delete store[dateKey]
  writeStore(store)
  writeWallet(buildWalletFromStore(store))
  return true
}

export const adjustSolarisWallet = (type: SolarisType, delta: number) => {
  const wallet = readWallet()
  const nextValue = (wallet[type] ?? 0) + delta
  wallet[type] = Math.max(0, nextValue)
  writeWallet(wallet)
  return wallet
}

export const spendSolaris = (type: SolarisType, amount: number) => {
  if (amount <= 0) return true
  const wallet = readWallet()
  if ((wallet[type] ?? 0) < amount) return false
  wallet[type] = Math.max(0, (wallet[type] ?? 0) - amount)
  writeWallet(wallet)
  return true
}

export const toggleHabitCompletion = (
  dateKey: string,
  habitId: string,
  points: number,
  type: SolarisType,
): SolarisDayData => {
  const store = readStore()
  const data = store[dateKey] ?? createDayData()
  if (!data.claimed) {
    data.claimed = data.completed ? { ...data.completed } : {}
  }
  const existing = data.completed[habitId]
  const claimedEntry = data.claimed[habitId]

  if (existing) {
    delete data.completed[habitId]
    data.counts[existing.type] = Math.max(
      0,
      (data.counts[existing.type] ?? 0) - existing.points,
    )
  } else {
    const entryType = claimedEntry?.type ?? type
    const entryPoints = claimedEntry?.points ?? points
    data.completed[habitId] = { type: entryType, points: entryPoints }
    data.counts[entryType] = (data.counts[entryType] ?? 0) + entryPoints

    if (!claimedEntry) {
      data.claimed[habitId] = { type: entryType, points: entryPoints }
      adjustSolarisWallet(entryType, entryPoints)
    }
  }

  store[dateKey] = data
  writeStore(store)
  return data
}

export const subscribeSolaris = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => handler()
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === WALLET_KEY) handler()
  }

  window.addEventListener(SOLARIS_EVENT, onEvent)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(SOLARIS_EVENT, onEvent)
    window.removeEventListener('storage', onStorage)
  }
}
