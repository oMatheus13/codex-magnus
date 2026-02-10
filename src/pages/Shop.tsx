import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { DiceIcon } from '../components/DiceIcon'
import { calculateHabitPointsStats } from '../core/habitStats'
import { getPriceMultiplier } from '../core/pricing'
import { diceCatalog, type DiceVariant } from '../data/dice'
import { oficinaHabits } from '../data/oficina'
import { spendSolaris, type SolarisType } from '../services/solaris'
import { addDice } from '../services/diceInventory'

const getBonusTag = (multiplier: number) => {
  if (multiplier >= 1.2) return 'Ritmo intenso'
  if (multiplier <= 0.9) return 'Ritmo leve'
  return null
}

const currencyLabel: Record<SolarisType, string> = {
  morning: 'Solaris da manha',
  afternoon: 'Solaris da tarde',
  night: 'Solaris da noite',
}

export function Shop() {
  const stats = useMemo(() => calculateHabitPointsStats(oficinaHabits), [])
  const priceMultiplier = useMemo(
    () => getPriceMultiplier(stats.estimatedDailyPoints),
    [stats.estimatedDailyPoints],
  )
  const bonusTag = useMemo(() => getBonusTag(priceMultiplier), [priceMultiplier])

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [highlighted, setHighlighted] = useState<DiceVariant | null>(null)

  useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    if (!highlighted) return undefined
    const timeout = window.setTimeout(() => setHighlighted(null), 1400)
    return () => window.clearTimeout(timeout)
  }, [highlighted])

  const tunedItems = useMemo(() => {
    return diceCatalog.map((item) => {
      const cost = Math.max(1, Math.round(item.baseCost * priceMultiplier))
      const bonus = bonusTag ? [...item.bonus, bonusTag] : item.bonus
      return {
        ...item,
        cost,
        bonus,
      }
    })
  }, [priceMultiplier, bonusTag])

  const handlePurchase = (item: (typeof tunedItems)[number]) => {
    setFeedback(null)
    const success = spendSolaris(item.currency, item.cost)

    if (!success) {
      setFeedback({
        type: 'error',
        message: `Saldo insuficiente de ${currencyLabel[item.currency]}.`,
      })
      return
    }

    addDice(item.id, 1)
    setHighlighted(item.id)
    setFeedback({
      type: 'success',
      message: `${item.name} comprado com sucesso.`,
    })
  }

  return (
    <div className="page shop-page">
      {feedback ? (
        <div className={`shop-feedback ${feedback.type}`} role="status">
          {feedback.message}
        </div>
      ) : null}

      <section className="shop-shelves">
        <section
          className="shop-shelf"
          style={{ '--shelf-accent': '#ff4fd8' } as CSSProperties}
        >
          <header className="shop-shelf-header">
            <div>
              <div className="shop-shelf-title">Prateleira Central</div>
            </div>
            <div className="shop-shelf-tag">Dados principais</div>
          </header>
          <div className="shop-shelf-items">
            {tunedItems.map((item) => {
              return (
                <article
                  key={item.id}
                  className={`shop-dice-card${
                    highlighted === item.id ? ' is-purchased' : ''
                  }`}
                  style={
                    {
                      '--dice-glow': item.tone.glow,
                      '--dice-accent': item.tone.accent,
                    } as CSSProperties
                  }
                >
                  <div className="shop-dice-left">
                    <div className="shop-dice-heading">
                      <span className="shop-dice-name">{item.name}</span>
                      <span className="shop-dice-tagline">{item.tagline}</span>
                    </div>
                    <div className="shop-dice-visual">
                      <DiceIcon
                        variant={item.id}
                        label={`${item.faces}`}
                        className="shop-dice-svg"
                      />
                    </div>
                  </div>
                  <div className="shop-dice-right">
                    <div className="shop-dice-meta">
                      <div className="shop-dice-faces">
                        <span>Faces</span>
                        <strong>{item.faces}</strong>
                      </div>
                      <div className="shop-dice-bonus">
                        <span>Bonus</span>
                        {item.bonus.length ? (
                          <ul>
                            {item.bonus.map((bonus) => (
                              <li key={bonus}>{bonus}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="shop-bonus-empty">Sem bonus</div>
                        )}
                      </div>
                    </div>
                    <div className="shop-dice-footer">
                      <div className="shop-card-cost">
                        <img
                          className="shop-solaris"
                          src={item.icon}
                          alt=""
                          aria-hidden="true"
                        />
                        <span>{item.cost}</span>
                      </div>
                      <button
                        className="button primary"
                        type="button"
                        onClick={() => handlePurchase(item)}
                      >
                        Comprar
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </section>
    </div>
  )
}
