import { useState } from 'react'

const turns = [
  { id: 'morning', label: 'Manha' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'night', label: 'Noite' },
]

export function TurnSelector() {
  const [active, setActive] = useState('morning')

  return (
    <section className="card">
      <div className="card-title">Turno</div>
      <div className="turn-selector">
        {turns.map((turn) => (
          <button
            key={turn.id}
            type="button"
            className={
              active === turn.id ? 'turn-button is-active' : 'turn-button'
            }
            onClick={() => setActive(turn.id)}
          >
            {turn.label}
          </button>
        ))}
      </div>
    </section>
  )
}
