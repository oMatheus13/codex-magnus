export type AuthTab = 'login' | 'signup'

const tabs: Array<{ id: AuthTab; label: string }> = [
  { id: 'login', label: 'Entrar' },
  { id: 'signup', label: 'Criar conta' },
]

type AuthTabsProps = {
  activeTab: AuthTab
  onChange: (tab: AuthTab) => void
}

export function AuthTabs({ activeTab, onChange }: AuthTabsProps) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Autenticacao">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`auth-tab${activeTab === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
