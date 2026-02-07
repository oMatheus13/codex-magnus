import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Hoje', end: true },
  { to: '/board', label: 'Tabuleiro' },
  { to: '/workshop', label: 'Oficina' },
  { to: '/history', label: 'Historico' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `nav-link${isActive ? ' is-active' : ''}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
