import { HabitList } from '../components/HabitList'
import { TurnSelector } from '../components/TurnSelector'

export function Today() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Hoje</h1>
        <p>Progresso rapido para manter o ritmo diario.</p>
      </header>
      <div className="page-grid">
        <TurnSelector />
        <HabitList />
      </div>
    </div>
  )
}
