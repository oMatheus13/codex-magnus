import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'
import { AppRoutes } from './routes'
import { startUserSync } from '../services/userSync'
import { MusicPlayer } from '../components/MusicPlayer'

export function App() {
  const location = useLocation()
  const hideChrome =
    location.pathname === '/login' ||
    location.pathname === '/spotify/callback'

  useEffect(() => startUserSync(), [])

  return (
    <div className="app-shell vhs-frame">
      {hideChrome ? null : <TopBar />}
      <main className={hideChrome ? 'app-main auth-main' : 'app-main'}>
        <AppRoutes />
      </main>
      {hideChrome ? null : <BottomNav />}
      {hideChrome ? null : <MusicPlayer />}
    </div>
  )
}
