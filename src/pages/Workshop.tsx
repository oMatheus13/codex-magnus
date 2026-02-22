import { useEffect, useMemo, useRef, useState } from 'react'
import { oficinaSections } from '../data/oficina'
import {
  getDateKey,
  getSolarisDay,
  getSolarisTypeByTime,
  subscribeSolaris,
  toggleHabitCompletion,
  type SolarisType,
} from '../services/solaris'
import progressusBase from '../assets/vhs/Progressus Aeternus.png'
import progressusGlow from '../assets/vhs/Progressus Aeternus Brilho.png'
import corpusBase from '../assets/vhs/Corpus Potens.png'
import corpusGlow from '../assets/vhs/Corpus Potens Brilho.png'
import mensBase from '../assets/vhs/Mens Potens.png'
import mensGlow from '../assets/vhs/Mens Potens Brilho.png'
import actioBase from '../assets/vhs/Actio Suprema.png'
import actioGlow from '../assets/vhs/Actio Suprema Brilho.png'
import nexusBase from '../assets/vhs/Nexus Humanae.png'
import nexusGlow from '../assets/vhs/Nexus Humanae Brilho.png'
import opulentiaBase from '../assets/vhs/Opulentia Sapiens.png'
import opulentiaGlow from '../assets/vhs/Opulentia Sapiens Brilho.png'
import animaBase from '../assets/vhs/Anima Elevata.png'
import animaGlow from '../assets/vhs/Anima Elevata Brilho.png'
import voxBase from '../assets/vhs/Vox Nova.png'
import voxGlow from '../assets/vhs/Vox Nova Brilho.png'
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

const solarisIcons: Record<SolarisType, string> = {
  morning: solarisMorning,
  afternoon: solarisAfternoon,
  night: solarisNight,
}

const titleAssets: Record<string, { base: string; glow: string }> = {
  'progressus-aeternus': { base: progressusBase, glow: progressusGlow },
  'corpus-potens': { base: corpusBase, glow: corpusGlow },
  'mens-potens': { base: mensBase, glow: mensGlow },
  'actio-suprema': { base: actioBase, glow: actioGlow },
  'nexus-humanae': { base: nexusBase, glow: nexusGlow },
  'opulentia-sapiens': { base: opulentiaBase, glow: opulentiaGlow },
  'anima-elevata': { base: animaBase, glow: animaGlow },
  'vox-nova': { base: voxBase, glow: voxGlow },
}

export function Workshop() {
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
      <div className="workshop-list">
        {oficinaSections.map((section) => {
          const assets = titleAssets[section.latinKey]
          return (
            <section key={section.id} className="section-card">
              <div className="section-header">
                <div className="section-title">
                  {assets ? (
                    <div className="vhs-title">
                      <img
                        className="vhs-title-base"
                        src={assets.base}
                        alt={section.latin}
                      />
                      <img
                        className="vhs-title-glow"
                        src={assets.glow}
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                  ) : (
                    <div className="section-title-text">{section.latin}</div>
                  )}
                </div>
                <div className="section-meta">
                  <span className="section-name">{section.title}</span>
                  <span className="section-latin">{section.latin}</span>
                </div>
              </div>
              <div className="section-body">
                <ul className="section-habits">
                  {section.habits.map((habit) => {
                    const entry = dayData.completed[habit.id]
                    const icon = entry ? solarisIcons[entry.type] : null
                    return (
                      <li key={habit.id} className="section-habit-item">
                        <button
                          type="button"
                          className={`section-habit${entry ? ' is-complete' : ''}`}
                          onClick={() =>
                            handleHabitToggle(habit.id, habit.points)
                          }
                          aria-pressed={Boolean(entry)}
                        >
                          <span className="section-habit-label">
                            {habit.label}
                          </span>
                          <span className="section-habit-meta">
                            <span className="section-points">
                              +{habit.points}
                            </span>
                            <span className="section-habit-check">
                              {icon ? (
                                <img
                                  className="section-habit-solaris"
                                  src={icon}
                                  alt=""
                                  aria-hidden="true"
                                />
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {section.subSections.map((subSection) => (
                  <div key={subSection.id} className="section-subgroup">
                    <div className="section-subtitle">
                      {subSection.title}
                      <span className="section-subtitle-latin">
                        {subSection.latin}
                      </span>
                    </div>
                    <ul className="section-habits">
                      {subSection.habits.map((habit) => {
                        const entry = dayData.completed[habit.id]
                        const icon = entry ? solarisIcons[entry.type] : null
                        return (
                          <li key={habit.id} className="section-habit-item">
                            <button
                              type="button"
                              className={`section-habit${
                                entry ? ' is-complete' : ''
                              }`}
                              onClick={() =>
                                handleHabitToggle(habit.id, habit.points)
                              }
                              aria-pressed={Boolean(entry)}
                            >
                              <span className="section-habit-label">
                                {habit.label}
                              </span>
                              <span className="section-habit-meta">
                                <span className="section-points">
                                  +{habit.points}
                                </span>
                                <span className="section-habit-check">
                                  {icon ? (
                                    <img
                                      className="section-habit-solaris"
                                      src={icon}
                                      alt=""
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
