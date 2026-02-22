import { useEffect, useMemo, useRef, useState } from 'react'
import { createPixiApp, type ChoiceOption, type MoveState } from './pixiApp'
import { diceCatalog } from '../data/dice'
import { DiceIcon } from '../components/DiceIcon'
import {
  consumeDice,
  getDiceInventory,
  subscribeDiceInventory,
} from '../services/diceInventory'

type RollResult = {
  diceId: string
  value: number
  status: 'rolling' | 'done'
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
  const isDev = import.meta.env.DEV

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const handle = createPixiApp(host, {
      onChoice: (options) => setChoices(options),
      onStateChange: (state) => setMoveState(state),
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

  const canRoll = useMemo(
    () => !moveState.moving && !moveState.awaitingChoice && !isRolling,
    [moveState, isRolling],
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

  return (
    <div className="game-shell">
      <div className="game-view" ref={hostRef} />
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
