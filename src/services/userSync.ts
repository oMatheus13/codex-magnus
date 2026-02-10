import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  getSolarisWallet,
  setSolarisWallet,
  subscribeSolaris,
  type SolarisCounts,
} from './solaris'
import {
  getDiceInventory,
  setDiceInventory,
  subscribeDiceInventory,
  type DiceInventory,
} from './diceInventory'
import {
  getBoardState,
  setBoardState,
  subscribeBoardState,
  type BoardState,
} from './boardState'

const hasValue = (value: number) => Number.isFinite(value) && value > 0

const totalWallet = (wallet: SolarisCounts) =>
  (wallet.morning ?? 0) + (wallet.afternoon ?? 0) + (wallet.night ?? 0)

const totalDice = (inventory: DiceInventory) =>
  (inventory.aurora ?? 0) + (inventory.vesper ?? 0) + (inventory.noctis ?? 0)

const parseWallet = (value: unknown): SolarisCounts | null => {
  if (!value || typeof value !== 'object') return null
  const wallet = value as Partial<SolarisCounts>
  if (
    !hasValue(wallet.morning ?? 0) &&
    !hasValue(wallet.afternoon ?? 0) &&
    !hasValue(wallet.night ?? 0)
  ) {
    return null
  }

  return {
    morning: wallet.morning ?? 0,
    afternoon: wallet.afternoon ?? 0,
    night: wallet.night ?? 0,
  }
}

const parseDice = (value: unknown): DiceInventory | null => {
  if (!value || typeof value !== 'object') return null
  const inventory = value as Partial<DiceInventory>
  if (
    !hasValue(inventory.aurora ?? 0) &&
    !hasValue(inventory.vesper ?? 0) &&
    !hasValue(inventory.noctis ?? 0)
  ) {
    return null
  }

  return {
    aurora: inventory.aurora ?? 0,
    vesper: inventory.vesper ?? 0,
    noctis: inventory.noctis ?? 0,
  }
}

const parseBoardState = (value: unknown): BoardState | null => {
  if (!value || typeof value !== 'object') return null
  const state = value as Partial<BoardState>
  if (
    typeof state.seed !== 'number' ||
    typeof state.days !== 'number' ||
    typeof state.estimatedDailyMoves !== 'number' ||
    typeof state.currentNodeId !== 'string' ||
    typeof state.updatedAt !== 'string'
  ) {
    return null
  }
  return {
    seed: state.seed,
    days: state.days,
    estimatedDailyMoves: state.estimatedDailyMoves,
    currentNodeId: state.currentNodeId,
    updatedAt: state.updatedAt,
  }
}

const pickWallet = (local: SolarisCounts, remote: SolarisCounts | null) => {
  if (!remote) return local
  return totalWallet(remote) >= totalWallet(local) ? remote : local
}

const pickDice = (local: DiceInventory, remote: DiceInventory | null) => {
  if (!remote) return local
  return totalDice(remote) >= totalDice(local) ? remote : local
}

const pickBoardState = (local: BoardState | null, remote: BoardState | null) => {
  if (!remote && !local) return null
  if (!remote) return local
  if (!local) return remote
  const localTime = Date.parse(local.updatedAt)
  const remoteTime = Date.parse(remote.updatedAt)
  if (!Number.isNaN(remoteTime) && !Number.isNaN(localTime)) {
    return remoteTime >= localTime ? remote : local
  }
  return remoteTime ? remote : local
}

export const startUserSync = () => {
  let activeUser: User | null = null
  let syncTimeout: number | null = null
  let lastSnapshot = ''
  let unsubSolaris: () => void = () => {}
  let unsubDice: () => void = () => {}
  let unsubBoard: () => void = () => {}

  const buildSnapshot = () =>
    JSON.stringify({
      wallet: getSolarisWallet(),
      dice: getDiceInventory(),
      board: getBoardState(),
    })

  const pushToRemote = async () => {
    if (!activeUser) return
    const snapshot = buildSnapshot()
    if (snapshot === lastSnapshot) return
    lastSnapshot = snapshot

    await supabase.auth.updateUser({
      data: {
        solaris_wallet: getSolarisWallet(),
        dice_inventory: getDiceInventory(),
        board_state: getBoardState(),
        sync_at: new Date().toISOString(),
      },
    })
  }

  const scheduleSync = () => {
    if (!activeUser) return
    if (syncTimeout) window.clearTimeout(syncTimeout)
    syncTimeout = window.setTimeout(pushToRemote, 800)
  }

  const hydrate = (user: User) => {
    const remoteWallet = parseWallet(user.user_metadata?.solaris_wallet)
    const remoteDice = parseDice(user.user_metadata?.dice_inventory)
    const remoteBoard = parseBoardState(user.user_metadata?.board_state)

    const localWallet = getSolarisWallet()
    const localDice = getDiceInventory()
    const localBoard = getBoardState()

    const pickedWallet = pickWallet(localWallet, remoteWallet)
    const pickedDice = pickDice(localDice, remoteDice)
    const pickedBoard = pickBoardState(localBoard, remoteBoard)

    setSolarisWallet(pickedWallet)
    setDiceInventory(pickedDice)
    if (pickedBoard) {
      setBoardState(pickedBoard)
    }

    lastSnapshot = buildSnapshot()
  }

  const startListeners = () => {
    unsubSolaris = subscribeSolaris(scheduleSync)
    unsubDice = subscribeDiceInventory(scheduleSync)
    unsubBoard = subscribeBoardState(scheduleSync)
  }

  const stopListeners = () => {
    unsubSolaris()
    unsubDice()
    unsubBoard()
  }

  const setUser = (user: User | null) => {
    activeUser = user
    stopListeners()
    if (activeUser) {
      hydrate(activeUser)
      startListeners()
    }
  }

  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user ?? null)
  })

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    },
  )

  return () => {
    if (syncTimeout) window.clearTimeout(syncTimeout)
    stopListeners()
    listener.subscription.unsubscribe()
  }
}
