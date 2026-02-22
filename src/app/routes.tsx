import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { getDevUser, subscribeDevSession, type DevUser } from '../services/devSession'
import { Today } from '../pages/Today'
import { Board } from '../pages/Board'
import { Workshop } from '../pages/Workshop'
import { Album } from '../pages/Album'
import { Shop } from '../pages/Shop'
import { Auth } from '../pages/Auth'
import { Profile } from '../pages/Profile'
import { RetroTitle } from '../pages/RetroTitle'
import { SpotifyCallback } from '../pages/SpotifyCallback'

type AuthState = {
  session: Session | null
  devUser: DevUser | null
  loading: boolean
}

const useAuthSession = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<DevUser | null>(() => getDevUser())
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

  useEffect(() => {
    return subscribeDevSession(() => {
      setDevUser(getDevUser())
    })
  }, [])

  return { session, devUser, loading }
}

function RequireAuth({ auth }: { auth: AuthState }) {
  if (auth.loading) {
    return (
      <div className="page">
        <section className="card">Carregando...</section>
      </div>
    )
  }

  if (!auth.session && !auth.devUser) {
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

  if (auth.session || auth.devUser) {
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
            <Auth />
          </RedirectIfAuth>
        }
      />
      <Route path="/spotify/callback" element={<SpotifyCallback />} />
      <Route path="/retro-title" element={<RetroTitle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
