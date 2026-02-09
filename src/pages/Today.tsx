import { HabitList } from '../components/HabitList'
import { oficinaSections } from '../data/oficina'

export function Today() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Home</h1>
        <p>Controle rapido dos habitos do dia.</p>
      </header>
      <HabitList sections={oficinaSections} />
    </div>
  )
}
