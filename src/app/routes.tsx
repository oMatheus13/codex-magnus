import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Today } from '../pages/Today'
import { Board } from '../pages/Board'
import { Workshop } from '../pages/Workshop'
import { Album } from '../pages/Album'
import { Shop } from '../pages/Shop'
import { Login } from '../pages/Login'
import { SignUp } from '../pages/SignUp'
import { Profile } from '../pages/Profile'
import { RetroTitle } from '../pages/RetroTitle'

type AuthState = {
  session: Session | null
  loading: boolean
}

const useAuthSession = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isActive) return
        setSession(nextSession ?? null)
        setLoading(false)
      },
    )

    return () => {
      isActive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}

function RequireAuth({ auth }: { auth: AuthState }) {
  if (auth.loading) {
    return (
      <div className="page">
        <section className="card">Carregando...</section>
      </div>
    )
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function RedirectIfAuth({
  auth,
  children,
}: {
  auth: AuthState
  children: JSX.Element
}) {
  if (auth.loading) {
    return (
      <div className="page">
        <section className="card">Carregando...</section>
      </div>
    )
  }

  if (auth.session) {
    return <Navigate to="/" replace />
  }

  return children
}

export function AppRoutes() {
  const auth = useAuthSession()

  return (
    <Routes>
      <Route element={<RequireAuth auth={auth} />}>
        <Route path="/" element={<Today />} />
        <Route path="/iter-vitus" element={<Board />} />
        <Route path="/memoriam-victoriae" element={<Album />} />
        <Route path="/officina-virtutum" element={<Workshop />} />
        <Route path="/loja" element={<Shop />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>
      <Route
        path="/login"
        element={
          <RedirectIfAuth auth={auth}>
            <Login />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/criar-conta"
        element={
          <RedirectIfAuth auth={auth}>
            <SignUp />
          </RedirectIfAuth>
        }
      />
      <Route path="/retro-title" element={<RetroTitle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
