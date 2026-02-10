import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { AuthTabs, type AuthTab } from '../components/AuthTabs'
import { setDevUser } from '../services/devSession'

type AuthStatus = 'idle' | 'loading'

export function Auth() {
  const [tab, setTab] = useState<AuthTab>('login')
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginShowPassword, setLoginShowPassword] = useState(false)
  const [loginStatus, setLoginStatus] = useState<AuthStatus>('idle')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupShowPassword, setSignupShowPassword] = useState(false)
  const [signupDisplayName, setSignupDisplayName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupStatus, setSignupStatus] = useState<AuthStatus>('idle')
  const [signupError, setSignupError] = useState<string | null>(null)
  const navigate = useNavigate()
  const isDev = import.meta.env.DEV

  const handleTabChange = (next: AuthTab) => {
    setTab(next)
    setLoginError(null)
    setSignupError(null)
  }

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
    setLoginStatus('loading')
    setLoginError(null)

    try {
      const email = await resolveLoginEmail(loginIdentifier)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      })

      if (signInError) {
        setLoginError(signInError.message)
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Falha ao entrar')
    }

    setLoginStatus('idle')
  }

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault()
    setSignupStatus('loading')
    setSignupError(null)

    const metadata: Record<string, string> = {}
    if (signupDisplayName.trim()) {
      metadata.display_name = signupDisplayName.trim()
    }

    if (signupUsername.trim()) {
      const normalized = signupUsername.trim().replace(/^@/, '')
      const { data: existing, error: lookupError } = await supabase.rpc(
        'get_email_by_username',
        { username: normalized },
      )

      if (lookupError) {
        setSignupError(lookupError.message)
        setSignupStatus('idle')
        return
      }

      if (existing) {
        setSignupError('Esse @ ja esta em uso')
        setSignupStatus('idle')
        return
      }

      metadata.username = normalized
      metadata.username_updated_at = new Date().toISOString()
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: Object.keys(metadata).length ? { data: metadata } : undefined,
    })

    if (signUpError) {
      setSignupError(signUpError.message)
      setSignupStatus('idle')
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
          setSignupError('Esse @ ja esta em uso')
        } else {
          setSignupError(profileError.message)
        }
      }
    }

    setSignupStatus('idle')
  }

  const handleDevLogin = () => {
    if (!isDev || loginStatus === 'loading') return
    setDevUser()
    navigate('/')
  }

  return (
    <div className="page auth-page">
      <div className="auth-stack">
        <AuthTabs activeTab={tab} onChange={handleTabChange} />
        <section className="card auth-card">
          {tab === 'login' ? (
            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="field">
                <span>Email ou @</span>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.target.value)}
                  placeholder="voce@email.com ou @usuario"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <div className="password-field">
                  <input
                    type={loginShowPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setLoginShowPassword((value) => !value)
                    }
                    aria-label={
                      loginShowPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                  >
                    {loginShowPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              {loginError ? <div className="form-error">{loginError}</div> : null}
              <div className="auth-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={loginStatus === 'loading'}
                >
                  Entrar
                </button>
                {isDev ? (
                  <button
                    className="button ghost"
                    type="button"
                    onClick={handleDevLogin}
                    disabled={loginStatus === 'loading'}
                  >
                    Login dev
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUp}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <div className="password-field">
                  <input
                    type={signupShowPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setSignupShowPassword((value) => !value)
                    }
                    aria-label={
                      signupShowPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                  >
                    {signupShowPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>Nome (opcional)</span>
                <input
                  type="text"
                  value={signupDisplayName}
                  onChange={(event) => setSignupDisplayName(event.target.value)}
                  placeholder="Seu nome"
                  autoComplete="nickname"
                />
              </label>
              <label className="field">
                <span>@ de usuario (opcional)</span>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={(event) => setSignupUsername(event.target.value)}
                  placeholder="seu_usuario"
                  autoComplete="username"
                />
              </label>
              {signupError ? (
                <div className="form-error">{signupError}</div>
              ) : null}
              <div className="auth-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={signupStatus === 'loading'}
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
