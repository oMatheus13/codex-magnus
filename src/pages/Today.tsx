import { useEffect, useMemo, useRef, useState } from 'react'
import { oficinaHabits, type HabitFrequency } from '../data/oficina'
import {
  getDateKey,
  getSolarisDay,
  getSolarisTypeByTime,
  subscribeSolaris,
  toggleHabitCompletion,
  type SolarisType,
} from '../services/solaris'
import solarisMorning from '../assets/solaris/Solaris Manhã.png'
import solarisAfternoon from '../assets/solaris/Solaris Tarde.png'
import solarisNight from '../assets/solaris/Solaris Noite.png'

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DRAG_THRESHOLD = 40
const CLICK_THRESHOLD = 6
const DAY_RANGE = 27

const buildRangeDates = (date: Date) => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  const half = Math.floor(DAY_RANGE / 2)

  return Array.from({ length: DAY_RANGE }, (_, index) => {
    const day = new Date(base)
    day.setDate(base.getDate() + index - half)
    return day
  })
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const frequencyOrder: HabitFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
]

const frequencyLabels: Record<HabitFrequency, string> = {
  daily: 'Diarios',
  weekly: 'Semanais',
  monthly: 'Mensais',
  quarterly: 'Trimestrais',
}

const solarisIcons: Record<SolarisType, string> = {
  morning: solarisMorning,
  afternoon: solarisAfternoon,
  night: solarisNight,
}

export function Today() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [dayData, setDayData] = useState(() =>
    getSolarisDay(getDateKey(new Date())),
  )
  const dragRef = useRef({
    startX: 0,
    ignoreClick: false,
  })

  const weekDates = useMemo(() => buildRangeDates(selectedDate), [selectedDate])
  const dateKey = useMemo(() => getDateKey(selectedDate), [selectedDate])

  const habitsByFrequency = useMemo(() => {
    const map = new Map<HabitFrequency, typeof oficinaHabits>()
    frequencyOrder.forEach((freq) => map.set(freq, []))
    oficinaHabits.forEach((habit) => {
      const list = map.get(habit.frequency) ?? []
      list.push(habit)
      map.set(habit.frequency, list)
    })
    return map
  }, [])

  useEffect(() => {
    setDayData(getSolarisDay(dateKey))
  }, [dateKey])

  useEffect(() => {
    return subscribeSolaris(() => {
      setDayData(getSolarisDay(dateKey))
    })
  }, [dateKey])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.startX = event.clientX
    dragRef.current.ignoreClick = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const delta = event.clientX - dragRef.current.startX
    if (Math.abs(delta) > CLICK_THRESHOLD) {
      dragRef.current.ignoreClick = true
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const delta = event.clientX - dragRef.current.startX
    const absDelta = Math.abs(delta)
    if (absDelta > DRAG_THRESHOLD) {
      const direction = delta < 0 ? 1 : -1
      setSelectedDate((current) => {
        const next = new Date(current)
        next.setDate(current.getDate() + direction)
        return next
      })
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleDayClick = (date: Date) => {
    if (dragRef.current.ignoreClick) {
      dragRef.current.ignoreClick = false
      return
    }
    setSelectedDate(date)
  }

  const handleHabitToggle = (habitId: string, points: number) => {
    const solarisType = getSolarisTypeByTime()
    setDayData(toggleHabitCompletion(dateKey, habitId, points, solarisType))
  }

  return (
    <div className="page">
      <section className="home-week">
        <div
          className="week-strip"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {weekDates.map((date) => {
            const isActive = isSameDay(date, selectedDate)
            const label = dayLabels[date.getDay()]
            return (
              <button
                key={date.toISOString()}
                type="button"
                className={`week-day${isActive ? ' is-active' : ''}`}
                onClick={() => handleDayClick(date)}
                aria-pressed={isActive}
              >
                <div className="week-card">
                  <span className="week-label">{label}</span>
                  <span className="week-number">{date.getDate()}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>
      <section className="home-habits">
        {frequencyOrder.map((frequency) => {
          const habits = habitsByFrequency.get(frequency) ?? []
          if (!habits.length) return null
          return (
            <div key={frequency} className="home-group">
              <div className="home-group-title">
                {frequencyLabels[frequency]}
              </div>
              <div className="habit-grid">
                {habits.map((habit) => {
                  const entry = dayData.completed[habit.id]
                  const icon = entry ? solarisIcons[entry.type] : null
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      className={`habit-tile${entry ? ' is-complete' : ''}`}
                      onClick={() => handleHabitToggle(habit.id, habit.points)}
                    >
                      <div className="habit-tile-content">
                        <div className="habit-tile-label">
                          <span>{habit.label}</span>
                        </div>
                        <div className="habit-tile-points">+{habit.points}</div>
                      </div>
                      {icon ? (
                        <div className="habit-tile-overlay">
                          <img
                            className="habit-solaris"
                            src={icon}
                            alt=""
                            aria-hidden="true"
                          />
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
