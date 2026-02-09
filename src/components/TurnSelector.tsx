import type { TurnId } from '../core/rules'
import solarisMorning from '../assets/solaris/Solaris Manhã.png'
import solarisAfternoon from '../assets/solaris/Solaris Tarde.png'
import solarisNight from '../assets/solaris/Solaris Noite.png'

type TurnOption = {
  id: TurnId
  label: string
  icon: string
}

const turns: TurnOption[] = [
  { id: 'morning', label: 'Manhã', icon: solarisMorning },
  { id: 'afternoon', label: 'Tarde', icon: solarisAfternoon },
  { id: 'night', label: 'Noite', icon: solarisNight },
]

type TurnSelectorProps = {
  value: TurnId
  onChange: (turn: TurnId) => void
}

export function TurnSelector({ value, onChange }: TurnSelectorProps) {
  return (
    <section className="card">
      <div className="card-title">Turno</div>
      <div className="turn-selector">
        {turns.map((turn) => (
          <button
            key={turn.id}
            type="button"
            className={value === turn.id ? 'turn-button is-active' : 'turn-button'}
            onClick={() => onChange(turn.id)}
            aria-pressed={value === turn.id}
          >
            <img
              className="turn-icon"
              src={turn.icon}
              alt=""
              aria-hidden="true"
            />
            <span>{turn.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
