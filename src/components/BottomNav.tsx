import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/iter-vitus', label: 'Iter Vitus' },
  { to: '/memoriam-victoriae', label: 'Memoriam Victoriae' },
  { to: '/officina-virtutum', label: 'Officina Virtutum' },
  { to: '/loja', label: 'Lojinha' },
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
