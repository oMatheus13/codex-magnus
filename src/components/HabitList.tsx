const habits = [
  { id: 'agua', label: 'Beber agua' },
  { id: 'movimento', label: 'Movimento 20 min' },
  { id: 'leitura', label: 'Leitura' },
  { id: 'sono', label: 'Sono regular' },
]

export function HabitList() {
  return (
    <section className="card">
      <div className="card-title">Habitos de hoje</div>
      <ul className="habit-list">
        {habits.map((habit) => (
          <li key={habit.id} className="habit-item">
            <label className="habit-label">
              <input type="checkbox" defaultChecked={false} />
              <span>{habit.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
