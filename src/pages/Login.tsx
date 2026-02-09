import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../services/supabase'
import { AuthTabs } from '../components/AuthTabs'

type AuthStatus = 'idle' | 'loading'

export function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
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

  const resolveLoginEmail = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      throw new Error('Informe email ou @')
    }

    const looksLikeEmail = trimmed.includes('@') && trimmed.includes('.')
    if (looksLikeEmail) {
      return trimmed
    }

    const normalized = trimmed.replace(/^@/, '')
    const { data, error: lookupError } = await supabase.rpc(
      'get_email_by_username',
      { username: normalized },
    )

    if (lookupError) {
      throw lookupError
    }

    if (!data) {
      throw new Error('Usuario nao encontrado')
    }

    return data as string
  }

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setError(null)

    try {
      const email = await resolveLoginEmail(identifier)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar')
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
          <h1>Login</h1>
          <p>Use email ou @ com senha para entrar.</p>
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
            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="field">
                <span>Email ou @</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="voce@email.com ou @usuario"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 6 caracteres"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="auth-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={status === 'loading'}
                >
                  Entrar
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
