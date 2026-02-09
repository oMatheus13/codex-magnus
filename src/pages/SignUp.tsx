import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../services/supabase'
import { AuthTabs } from '../components/AuthTabs'

type AuthStatus = 'idle' | 'loading'

export function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return
      setUserEmail(data.session?.user?.email ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user?.email ?? null)
      },
    )

    return () => {
      isActive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    const metadata: Record<string, string> = {}
    if (displayName.trim()) {
      metadata.display_name = displayName.trim()
    }

    if (username.trim()) {
      const normalized = username.trim().replace(/^@/, '')
      const { data: existing, error: lookupError } = await supabase.rpc(
        'get_email_by_username',
        { username: normalized },
      )

      if (lookupError) {
        setError(lookupError.message)
        setStatus('idle')
        return
      }

      if (existing) {
        setError('Esse @ ja esta em uso')
        setStatus('idle')
        return
      }

      metadata.username = normalized
      metadata.username_updated_at = new Date().toISOString()
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: Object.keys(metadata).length ? { data: metadata } : undefined,
    })

    if (signUpError) {
      setError(signUpError.message)
      setStatus('idle')
      return
    }

    if (data.session?.user && Object.keys(metadata).length) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.session.user.id,
          display_name: metadata.display_name ?? null,
          username: metadata.username ?? null,
        },
        { onConflict: 'id' },
      )

      if (profileError) {
        if (profileError.code === '23505') {
          setError('Esse @ ja esta em uso')
        } else {
          setError(profileError.message)
        }
      }
    }

    setStatus('idle')
  }

  const handleSignOut = async () => {
    setStatus('loading')
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setError(signOutError.message)
    }

    setStatus('idle')
  }

  return (
    <div className="page auth-page">
      <div className="auth-stack">
        <div className="auth-brand">
          <div className="auth-brand-title" data-text="Codex Magnus">
            Codex Magnus
          </div>
          <div className="auth-brand-subtitle">
            Ritual de habitos com estetica VHS
          </div>
        </div>
        <header className="page-header auth-header">
          <h1>Criar conta</h1>
          <p>Defina seu perfil inicial para começar.</p>
        </header>
        <AuthTabs />
        <section className="card auth-card">
          {userEmail ? (
            <div className="auth-status">
              <div className="auth-user">Conectado: {userEmail}</div>
              <button
                type="button"
                className="button ghost"
                onClick={handleSignOut}
                disabled={status === 'loading'}
              >
                Sair
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSignUp}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>Nome (opcional)</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Seu nome"
                  autoComplete="nickname"
                />
              </label>
              <label className="field">
                <span>@ de usuario (opcional)</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="seu_usuario"
                  autoComplete="username"
                />
              </label>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="auth-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={status === 'loading'}
                >
                  Criar conta
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
