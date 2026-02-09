import type { HabitSection, HabitItem } from '../data/oficina'

type HabitListProps = {
  sections: HabitSection[]
}

const HabitRow = ({ habit }: { habit: HabitItem }) => {
  return (
    <li className="habit-item">
      <label className="habit-label">
        <input type="checkbox" defaultChecked={false} />
        <span className="habit-text">{habit.label}</span>
      </label>
      <div className="habit-meta">
        <span className="habit-points">+{habit.points}</span>
      </div>
    </li>
  )
}

export function HabitList({ sections }: HabitListProps) {
  return (
    <section className="card">
      <div className="card-title">Habitos de hoje</div>
      <div className="habit-sections">
        {sections.map((section) => (
          <div key={section.id} className="habit-section">
            <div className="habit-section-title">{section.title}</div>
            <ul className="habit-list">
              {section.habits.map((habit) => (
                <HabitRow key={habit.id} habit={habit} />
              ))}
            </ul>
            {section.subSections.map((subSection) => (
              <div key={subSection.id} className="habit-subsection">
                <div className="habit-subtitle">{subSection.title}</div>
                <ul className="habit-list">
                  {subSection.habits.map((habit) => (
                    <HabitRow key={habit.id} habit={habit} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
