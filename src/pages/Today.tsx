import { useEffect, useMemo, useState } from 'react'
import { oficinaHabits, oficinaSections } from '../data/oficina'
import { diceCatalog, type DiceVariant } from '../data/dice'
import { DiceIcon } from '../components/DiceIcon'
import { getDateKey, type SolarisType } from '../services/solaris'
import {
  addGoal,
  getGoals,
  removeGoal,
  subscribeGoals,
  toggleGoalDay,
  type Goal,
} from '../services/goals'
import {
  applyBoardReward,
  getPendingBoardEvents,
  resolveBoardEvent,
  subscribeBoardEvents,
  type BoardEvent,
  type BoardEventLogEntry,
} from '../services/boardEvents'
import goalCrystal from '../assets/icons/goal-crystal.svg'

const buildHabitGroups = () => {
  return oficinaSections.map((section) => {
    const habits = [
      ...section.habits,
      ...section.subSections.flatMap((subSection) => subSection.habits),
    ]
    return {
      id: section.id,
      label: section.title,
      habits,
    }
  })
}

const toDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const computeStreak = (dates: string[], todayKey: string) => {
  if (!dates.length) return 0
  const set = new Set(dates)
  let cursor = toDate(todayKey)
  let key = todayKey
  if (!set.has(key)) {
    cursor.setDate(cursor.getDate() - 1)
    key = getDateKey(cursor)
  }
  let streak = 0
  while (set.has(key)) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
    key = getDateKey(cursor)
  }
  return streak
}

const getRemaining = (goal: Goal) =>
  Math.max(0, goal.targetDays - goal.completedDates.length)

const formatDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
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

export function Today() {
  const [goals, setGoals] = useState(() => getGoals())
  const [selectedHabitId, setSelectedHabitId] = useState(
    () => oficinaHabits[0]?.id ?? '',
  )
  const [targetDays, setTargetDays] = useState(30)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [pendingChallenges, setPendingChallenges] = useState<
    BoardEventLogEntry[]
  >(() => getPendingBoardEvents().filter((entry) => entry.type === 'challenge'))

  const habitGroups = useMemo(() => buildHabitGroups(), [])
  const habitLookup = useMemo(() => {
    const map = new Map<string, { label: string }>()
    oficinaHabits.forEach((habit) => {
      map.set(habit.id, { label: habit.label })
    })
    return map
  }, [])

  const refreshPendingChallenges = () => {
    const next = getPendingBoardEvents().filter(
      (entry) => entry.type === 'challenge',
    )
    next.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
    setPendingChallenges(next)
  }

  useEffect(() => {
    return subscribeGoals(() => {
      setGoals(getGoals())
    })
  }, [])

  useEffect(() => {
    return subscribeBoardEvents(() => {
      refreshPendingChallenges()
    })
  }, [])

  const todayKey = getDateKey(new Date())
  const canCreateGoal = selectedHabitId && targetDays > 0
  const activeGoals = goals.filter(
    (goal) => goal.completedDates.length < goal.targetDays,
  )
  const completedGoals = goals.filter(
    (goal) => goal.completedDates.length >= goal.targetDays,
  )
  const calendarDays = useMemo(() => {
    const days: Array<{ key: string; label: number; isToday: boolean }> = []
    const today = toDate(todayKey)
    for (let i = 27; i >= 0; i -= 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      days.push({
        key: getDateKey(day),
        label: day.getDate(),
        isToday: i === 0,
      })
    }
    return days
  }, [todayKey])

  const handleCreateGoal = () => {
    const habit = habitLookup.get(selectedHabitId)
    if (!habit) return
    const normalizedTarget = Math.max(1, Math.min(365, Math.floor(targetDays)))
    setGoals(
      addGoal({
        habitId: selectedHabitId,
        habitLabel: habit.label,
        targetDays: normalizedTarget,
      }),
    )
    setIsModalOpen(false)
  }

  const handleToggleDay = (goalId: string) => {
    setGoals(toggleGoalDay(goalId, todayKey))
  }

  const handleRemoveGoal = (goalId: string) => {
    setGoals(removeGoal(goalId))
  }

  const handleToggleHistory = (goalId: string) => {
    setOpenHistoryId((current) => (current === goalId ? null : goalId))
  }

  const handleChallengeComplete = (entry: BoardEventLogEntry) => {
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

  const closeModal = () => setIsModalOpen(false)

  return (
    <div className="page">
      <div className="home-panels">
        <section className="home-challenges">
          <div className="card challenge-panel">
            <div className="challenge-panel-header">
              <div>
                <div className="card-title">Desafios do tabuleiro</div>
                <div className="challenge-panel-sub">
                  Complete os desafios pendentes e resgate as recompensas.
                </div>
              </div>
            </div>
            <div className="challenge-list">
              {pendingChallenges.length ? (
                pendingChallenges.map((entry) => (
                  <article key={entry.key} className="challenge-item">
                    <div className="challenge-item-header">
                      <span className="challenge-type">Desafio</span>
                      {entry.difficulty ? (
                        <span className="challenge-difficulty">
                          {entry.difficulty}
                        </span>
                      ) : null}
                    </div>
                    <div className="challenge-title">
                      {entry.title || 'Desafio do tabuleiro'}
                    </div>
                    <p className="challenge-description">
                      {entry.description || 'Detalhes indisponiveis no momento.'}
                    </p>
                    <div className="challenge-reward">
                      {entry.reward.type === 'solaris' ? (
                        <>
                          <img
                            src={solarisIcons[entry.reward.solaris]}
                            alt={solarisLabels[entry.reward.solaris]}
                          />
                          <div className="challenge-reward-label">
                            +{entry.reward.amount}{' '}
                            {solarisLabels[entry.reward.solaris]}
                          </div>
                        </>
                      ) : (
                        <>
                          <DiceIcon
                            variant={entry.reward.dice}
                            label="Dado"
                            className="challenge-reward-dice"
                          />
                          <div className="challenge-reward-label">
                            +{entry.reward.amount}{' '}
                            {getDiceLabel(entry.reward.dice)}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="challenge-actions">
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => handleChallengeComplete(entry)}
                      >
                        Marcar concluido
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="challenge-empty">Sem desafios pendentes.</div>
              )}
            </div>
          </div>
        </section>
        <section className="home-goals">
          <div className="card goal-panel">
            <div className="goal-panel-header">
              <div>
                <div className="card-title">Metas diarias</div>
                <div className="goal-panel-sub">
                  Escolha um habito e acompanhe sua sequencia.
                </div>
                {completedGoals.length > 0 ? (
                  <div className="goal-panel-meta">
                    {completedGoals.length} metas concluidas
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => setIsModalOpen(true)}
              >
                Nova meta
              </button>
            </div>

            <div className="goal-list">
              {activeGoals.length === 0 ? (
                <div className="goal-empty">
                  Nenhuma meta ativa no momento.
                </div>
              ) : (
                activeGoals.map((goal) => {
                  const completedCount = goal.completedDates.length
                  const remaining = getRemaining(goal)
                  const streak = computeStreak(goal.completedDates, todayKey)
                  const doneToday = goal.completedDates.includes(todayKey)
                  const isComplete = completedCount >= goal.targetDays
                  const isHistoryOpen = openHistoryId === goal.id
                  const historyDates = [...goal.completedDates].reverse()
                  const historySet = new Set(goal.completedDates)

                  return (
                    <article key={goal.id} className="goal-item">
                      <div className="goal-header">
                        <div>
                          <div className="goal-title">{goal.habitLabel}</div>
                          <div className="goal-meta">
                            <div
                              className={`goal-streak${
                                streak > 0 ? ' is-active' : ''
                              }`}
                            >
                              <img
                                className="goal-crystal"
                                src={goalCrystal}
                                alt=""
                                aria-hidden="true"
                              />
                              <span>{streak} sequencia</span>
                            </div>
                            <div className="goal-total">
                              Total {completedCount}
                            </div>
                          </div>
                        </div>
                        <div className="goal-progress">
                          <div className="goal-count">
                            {completedCount}/{goal.targetDays}
                          </div>
                          <div className="goal-remaining">
                            Faltam {remaining} dias
                          </div>
                        </div>
                      </div>
                      <div className="goal-footer">
                        <div className="goal-actions">
                          <button
                            type="button"
                            className="button ghost"
                            onClick={() => handleToggleDay(goal.id)}
                          >
                            {doneToday ? 'Desmarcar hoje' : 'Marcar hoje'}
                          </button>
                          <div className="goal-history-wrap">
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => handleToggleHistory(goal.id)}
                              aria-expanded={isHistoryOpen}
                            >
                              Historico
                            </button>
                            {isHistoryOpen ? (
                              <div className="goal-history-popover">
                                <div className="goal-history-title">
                                  Dias marcados
                                </div>
                                <div className="goal-history-calendar">
                                  {calendarDays.map((day) => {
                                    const isDone = historySet.has(day.key)
                                    return (
                                      <div
                                        key={day.key}
                                        className={`goal-calendar-day${
                                          isDone ? ' is-done' : ''
                                        }${day.isToday ? ' is-today' : ''}`}
                                      >
                                        {day.label}
                                      </div>
                                    )
                                  })}
                                </div>
                                {historyDates.length === 0 ? (
                                  <div className="goal-history-empty">
                                    Nenhum dia marcado ainda.
                                  </div>
                                ) : (
                                  <ul className="goal-history-list">
                                    {historyDates.map((date) => (
                                      <li key={date}>{formatDate(date)}</li>
                                    ))}
                                  </ul>
                                )}
                                <div className="goal-history-total">
                                  Total: {historyDates.length} dias
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="button ghost"
                            onClick={() => handleRemoveGoal(goal.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      <div
                        className={`goal-reward${
                          isComplete ? ' is-complete' : ''
                        }`}
                      >
                        {isComplete
                          ? 'Recompensa liberada: figurinha especial.'
                          : 'Recompensa: figurinha especial.'}
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            {completedGoals.length > 0 ? (
              <div className="goal-completed">
                <div className="goal-completed-header">
                  <div className="goal-completed-title">Historico</div>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setShowCompleted((current) => !current)}
                  >
                    {showCompleted ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {showCompleted ? (
                  <div className="goal-list">
                    {completedGoals.map((goal) => {
                      const completedCount = goal.completedDates.length
                      const remaining = getRemaining(goal)
                      const streak = computeStreak(goal.completedDates, todayKey)
                      const doneToday = goal.completedDates.includes(todayKey)
                      const isComplete = completedCount >= goal.targetDays
                      const isHistoryOpen = openHistoryId === goal.id
                      const historyDates = [...goal.completedDates].reverse()
                      const historySet = new Set(goal.completedDates)

                      return (
                        <article
                          key={goal.id}
                          className="goal-item is-complete"
                        >
                          <div className="goal-header">
                            <div>
                              <div className="goal-title">{goal.habitLabel}</div>
                              <div className="goal-meta">
                                <div
                                  className={`goal-streak${
                                    streak > 0 ? ' is-active' : ''
                                  }`}
                                >
                                  <img
                                    className="goal-crystal"
                                    src={goalCrystal}
                                    alt=""
                                    aria-hidden="true"
                                  />
                                  <span>{streak} sequencia</span>
                                </div>
                                <div className="goal-total">
                                  Total {completedCount}
                                </div>
                              </div>
                            </div>
                            <div className="goal-progress">
                              <div className="goal-count">
                                {completedCount}/{goal.targetDays}
                              </div>
                              <div className="goal-remaining">
                                Faltam {remaining} dias
                              </div>
                            </div>
                          </div>
                          <div className="goal-footer">
                            <div className="goal-actions">
                              <button
                                type="button"
                                className="button ghost"
                                onClick={() => handleToggleDay(goal.id)}
                              >
                                {doneToday ? 'Desmarcar hoje' : 'Marcar hoje'}
                              </button>
                              <div className="goal-history-wrap">
                                <button
                                  type="button"
                                  className="button ghost"
                                  onClick={() => handleToggleHistory(goal.id)}
                                  aria-expanded={isHistoryOpen}
                                >
                                  Historico
                                </button>
                                {isHistoryOpen ? (
                                  <div className="goal-history-popover">
                                    <div className="goal-history-title">
                                      Dias marcados
                                    </div>
                                    <div className="goal-history-calendar">
                                      {calendarDays.map((day) => {
                                        const isDone = historySet.has(day.key)
                                        return (
                                          <div
                                            key={day.key}
                                            className={`goal-calendar-day${
                                              isDone ? ' is-done' : ''
                                            }${
                                              day.isToday ? ' is-today' : ''
                                            }`}
                                          >
                                            {day.label}
                                          </div>
                                        )
                                      })}
                                    </div>
                                    {historyDates.length === 0 ? (
                                      <div className="goal-history-empty">
                                        Nenhum dia marcado ainda.
                                      </div>
                                    ) : (
                                      <ul className="goal-history-list">
                                        {historyDates.map((date) => (
                                          <li key={date}>{formatDate(date)}</li>
                                        ))}
                                      </ul>
                                    )}
                                    <div className="goal-history-total">
                                      Total: {historyDates.length} dias
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                className="button ghost"
                                onClick={() => handleRemoveGoal(goal.id)}
                                disabled={isComplete}
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                          <div
                            className={`goal-reward${
                              isComplete ? ' is-complete' : ''
                            }`}
                          >
                            {isComplete
                              ? 'Recompensa liberada: figurinha especial.'
                              : 'Recompensa: figurinha especial.'}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="goal-modal-backdrop" onClick={closeModal}>
          <div
            className="card goal-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="goal-modal-header">
              <div className="card-title">Nova meta</div>
              <button
                type="button"
                className="button ghost"
                onClick={closeModal}
              >
                Fechar
              </button>
            </div>
            <div className="goal-form-grid">
              <label className="field">
                <span>Habito</span>
                <select
                  value={selectedHabitId}
                  onChange={(event) => setSelectedHabitId(event.target.value)}
                >
                  {habitGroups.map((group) => (
                    <optgroup key={group.id} label={group.label}>
                      {group.habits.map((habit) => (
                        <option key={habit.id} value={habit.id}>
                          {habit.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Duracao da meta (dias)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={targetDays}
                  onChange={(event) =>
                    setTargetDays(Number(event.target.value))
                  }
                />
              </label>
            </div>
            <div className="goal-modal-actions">
              <button
                type="button"
                className="button ghost"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleCreateGoal}
                disabled={!canCreateGoal}
              >
                Criar meta
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
