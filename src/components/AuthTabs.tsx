import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/login', label: 'Entrar' },
  { to: '/criar-conta', label: 'Criar conta' },
]

export function AuthTabs() {
  return (
    <div className="auth-tabs" aria-label="Autenticacao">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `auth-tab${isActive ? ' is-active' : ''}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
