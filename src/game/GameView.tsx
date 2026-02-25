import { useEffect, useMemo, useRef, useState } from 'react'
import { createPixiApp, type ChoiceOption, type MoveState } from './pixiApp'
import { diceCatalog } from '../data/dice'
import { DiceIcon } from '../components/DiceIcon'
import type { DiceVariant } from '../data/dice'
import {
  consumeDice,
  getDiceInventory,
  subscribeDiceInventory,
} from '../services/diceInventory'
import {
  applyBoardReward,
  getBoardEventForNode,
  getBoardEventKey,
  getBoardEventStatus,
  getPendingBoardEvents,
  resolveBoardEvent,
  setBoardEventPending,
  subscribeBoardEvents,
  type BoardEvent,
  type BoardEventLogEntry,
} from '../services/boardEvents'
import type { SolarisType } from '../services/solaris'

type RollResult = {
  diceId: string
  value: number
  status: 'rolling' | 'done'
}

type BonusState = {
  key: string
  nodeId: string
  event: BoardEvent
}

const rollDice = (faces: number) => Math.floor(Math.random() * faces) + 1

const parseBonusValue = (label: string) => {
  const match = label.match(/([+-]?\\d+)/)
  if (!match) return 0
  return Number.parseInt(match[1], 10)
}

const computeDiceRoll = (dice: (typeof diceCatalog)[number]) => {
  let total = rollDice(dice.faces)
  if (dice.bonus.some((bonus) => bonus.toLowerCase().includes('relance'))) {
    total = Math.max(total, rollDice(dice.faces))
  }
  dice.bonus.forEach((bonus) => {
    const value = parseBonusValue(bonus)
    if (value) total += value
  })
  return total
}

const solarisIcons = diceCatalog.reduce(
  (acc, item) => {
    acc[item.currency] = item.icon
    return acc
  },
  {} as Record<SolarisType, string>,
)

const solarisLabels: Record<SolarisType, string> = {
  morning: 'Solaris da manha',
  afternoon: 'Solaris da tarde',
  night: 'Solaris da noite',
}

const getDiceLabel = (id: DiceVariant) =>
  diceCatalog.find((item) => item.id === id)?.name ?? 'Dado'

export function GameView() {
  const hostRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<ReturnType<typeof createPixiApp> | null>(null)
  const rollIntervalRef = useRef<number | null>(null)
  const rollTimeoutRef = useRef<number | null>(null)
  const [choices, setChoices] = useState<ChoiceOption[]>([])
  const [moveState, setMoveState] = useState<MoveState>({
    moving: false,
    awaitingChoice: false,
  })
  const [diceInventory, setDiceInventory] = useState(() =>
    getDiceInventory(),
  )
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [pendingChallenges, setPendingChallenges] = useState<
    BoardEventLogEntry[]
  >(() => getPendingBoardEvents().filter((entry) => entry.type === 'challenge'))
  const [activeBonus, setActiveBonus] = useState<BonusState | null>(null)
  const isDev = import.meta.env.DEV

  const refreshPendingChallenges = () => {
    const next = getPendingBoardEvents().filter(
      (entry) => entry.type === 'challenge',
    )
    next.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
    setPendingChallenges(next)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const handle = createPixiApp(host, {
      onChoice: (options) => setChoices(options),
      onStateChange: (state) => setMoveState(state),
      onEncounter: ({ node, totalNodes, seed }) => {
        const event = getBoardEventForNode(node, totalNodes, seed)
        if (!event) {
          return
        }
        const key = getBoardEventKey(seed, node.id)
        const status = getBoardEventStatus(key)
        if (status && status !== 'pending') return
        if (event.type === 'bonus') {
          if (!status) {
            setBoardEventPending(key, node.id, event)
          }
          setActiveBonus({ key, nodeId: node.id, event })
          return
        }
        if (!status) {
          setBoardEventPending(key, node.id, event)
        }
        refreshPendingChallenges()
      },
    })
    handleRef.current = handle
    return () => {
      handle.destroy()
      handleRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current)
      }
      if (rollTimeoutRef.current) {
        window.clearTimeout(rollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return subscribeDiceInventory(() => {
      setDiceInventory(getDiceInventory())
    })
  }, [])

  useEffect(() => {
    return subscribeBoardEvents(() => {
      refreshPendingChallenges()
    })
  }, [])

  const canRoll = useMemo(
    () =>
      !moveState.moving &&
      !moveState.awaitingChoice &&
      !isRolling &&
      !activeBonus,
    [moveState, isRolling, activeBonus],
  )

  const handleRoll = (diceId: string) => {
    if (!canRoll) return
    const dice = diceCatalog.find((item) => item.id === diceId)
    if (!dice) return
    const success = consumeDice(dice.id, 1)
    if (!success) return
    if (rollIntervalRef.current) {
      window.clearInterval(rollIntervalRef.current)
    }
    if (rollTimeoutRef.current) {
      window.clearTimeout(rollTimeoutRef.current)
    }

    const finalValue = computeDiceRoll(dice)
    setIsRolling(true)
    setRollResult({
      diceId: dice.id,
      value: rollDice(dice.faces),
      status: 'rolling',
    })

    rollIntervalRef.current = window.setInterval(() => {
      setRollResult((prev) =>
        prev
          ? {
              ...prev,
              value: rollDice(dice.faces),
              status: 'rolling',
            }
          : null,
      )
    }, 90)

    rollTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current)
      }
      setIsRolling(false)
      setRollResult({
        diceId: dice.id,
        value: finalValue,
        status: 'done',
      })
      handleRef.current?.moveSteps(finalValue)
    }, 900)
  }

  const handleChoice = (choiceId: string) => {
    handleRef.current?.choosePath(choiceId)
    setChoices([])
  }

  const handleEventClaim = (entry: BoardEventLogEntry) => {
    applyBoardReward(entry.reward)
    const event: BoardEvent = {
      id: entry.eventId,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      difficulty: entry.difficulty,
      reward: entry.reward,
    }
    resolveBoardEvent(entry.key, entry.nodeId, event)
    refreshPendingChallenges()
  }

  const handleBonusResolve = (claimReward: boolean) => {
    if (!activeBonus) return
    if (claimReward) {
      applyBoardReward(activeBonus.event.reward)
    }
    resolveBoardEvent(activeBonus.key, activeBonus.nodeId, activeBonus.event)
    setActiveBonus(null)
  }

  return (
    <div className="game-shell">
      <div className="game-view">
        <div className="game-canvas" ref={hostRef} />
        {activeBonus ? (
          <div className="game-event-overlay">
            <div className="game-event-popup">
              <div className="game-event-header">
                <span className="game-event-type bonus">Bonus</span>
              </div>
              <div className="game-event-title">{activeBonus.event.title}</div>
              <p className="game-event-description">
                {activeBonus.event.description}
              </p>
              <div className="game-event-reward">
                {activeBonus.event.reward.type === 'solaris' ? (
                  <>
                    <img
                      src={solarisIcons[activeBonus.event.reward.solaris]}
                      alt={solarisLabels[activeBonus.event.reward.solaris]}
                    />
                    <div className="game-event-reward-label">
                      +{activeBonus.event.reward.amount}{' '}
                      {solarisLabels[activeBonus.event.reward.solaris]}
                    </div>
                  </>
                ) : (
                  <>
                    <DiceIcon
                      variant={activeBonus.event.reward.dice}
                      label="Dado"
                      className="game-event-reward-dice"
                    />
                    <div className="game-event-reward-label">
                      +{activeBonus.event.reward.amount}{' '}
                      {getDiceLabel(activeBonus.event.reward.dice)}
                    </div>
                  </>
                )}
              </div>
              <div className="game-event-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => handleBonusResolve(false)}
                >
                  Ignorar
                </button>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => handleBonusResolve(true)}
                >
                  Coletar bonus
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <aside className="game-sidebar">
        <div className="game-panel">
          <div className="game-panel-title">Camera</div>
          <button
            type="button"
            className="button ghost"
            onClick={() => handleRef.current?.centerOnPawn()}
          >
            Centralizar peao
          </button>
        </div>
        <div className="game-panel-row">
          <div className="game-panel">
            <div className="game-panel-title">Dados</div>
            <div className="dice-panel">
              {diceCatalog.map((dice) => {
                const count = diceInventory[dice.id] ?? 0
                const displayCount = isDev ? 'x∞' : `x${count}`
                return (
                  <button
                    key={dice.id}
                    type="button"
                    className="dice-button"
                    onClick={() => handleRoll(dice.id)}
                    disabled={!canRoll || count <= 0}
                  >
                    <DiceIcon
                      variant={dice.id}
                      label={`${dice.faces}`}
                      className="dice-button-icon"
                    />
                    <div className="dice-button-info">
                      <span className="dice-button-name">{dice.name}</span>
                      <span className="dice-button-count">{displayCount}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {rollResult ? (
              <div className="dice-roll">
                {rollResult.status === 'rolling'
                  ? `Rolando... ${rollResult.value}`
                  : `Ultima rolagem: ${rollResult.value}`}
              </div>
            ) : null}
          </div>
          <div className="game-panel">
            <div className="game-panel-title">Desafios</div>
            <div className="game-event-list">
              {pendingChallenges.length ? (
                pendingChallenges.map((entry) => (
                  <div key={entry.key} className="game-event-item">
                    <div className="game-event-header">
                      <span className={`game-event-type ${entry.type}`}>
                        Desafio
                      </span>
                      {entry.difficulty ? (
                        <span className="game-event-difficulty">
                          {entry.difficulty}
                        </span>
                      ) : null}
                    </div>
                    <div className="game-event-title">
                      {entry.title || 'Encontro do tabuleiro'}
                    </div>
                    <p className="game-event-description">
                      {entry.description || 'Detalhes indisponiveis no momento.'}
                    </p>
                    <div className="game-event-reward">
                      {entry.reward.type === 'solaris' ? (
                        <>
                          <img
                            src={solarisIcons[entry.reward.solaris]}
                            alt={solarisLabels[entry.reward.solaris]}
                          />
                          <div className="game-event-reward-label">
                            +{entry.reward.amount}{' '}
                            {solarisLabels[entry.reward.solaris]}
                          </div>
                        </>
                      ) : (
                        <>
                          <DiceIcon
                            variant={entry.reward.dice}
                            label="Dado"
                            className="game-event-reward-dice"
                          />
                          <div className="game-event-reward-label">
                            +{entry.reward.amount}{' '}
                            {getDiceLabel(entry.reward.dice)}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="game-event-actions">
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => handleEventClaim(entry)}
                      >
                        Marcar concluido
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="game-event-empty">
                  Sem desafios pendentes.
                </div>
              )}
            </div>
          </div>
        </div>
        {choices.length ? (
          <div className="game-panel">
            <div className="game-panel-title">Bifurcacao</div>
            <div className="choice-panel">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="choice-button"
                  onClick={() => handleChoice(choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
